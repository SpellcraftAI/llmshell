import { serve, type BunFile } from "bun"
import { spawn } from "child_process"
import { Readable } from "stream"
import { JSONPropertyStream, type JSONPropertyChunk } from "@/internals/JSONPropertyStream"
import { parseContentStream } from "@/internals/parseContentStream"
import { FileWriteTransform } from "@/internals/FileWriteStream"

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

export type FileOperationType = "read" | "write" | "edit";

// File System Operations
export class FileSystem {
  async readFile(argChunks: ReadableStream<JSONPropertyChunk>) {
    const reader = argChunks.getReader()

    let path: string | undefined
    while (true) {
      const { done, value: { key, value } = {} } = await reader.read()
      if (done) break

      switch (typeof value) {
      case "string":
        if (key === "path") {
          if (!path) {
            path = value
          } else {
            path += value
          }
        }
        break

      default:
        throw new Error(`Unexpected value type: ${typeof value}`)
      }
    }

    if (!path) {
      throw new Error("No file path provided in the argument stream")
    }

    const file = Bun.file(path)
    return file.stream()
  }

  async writeFile(argStream: ReadableStream<JSONPropertyChunk>): Promise<ReadableStream<Uint8Array>> {
    const { path, content } = await parseContentStream(argStream)
    const file = Bun.file(path)
    // Clear file
    // await Bun.write(file, "")
    // Each chunk is written to file as it is streamed back
    return content.pipeThrough(new FileWriteTransform(file))
  }

  async editFileLines(argChunks: ReadableStream<JSONPropertyChunk>): Promise<ReadableStream<Uint8Array>> {
    // Parse the input stream to extract file editing parameters
    const { path, startLine, endLine, content } = await parseContentStream(argChunks)
    // console.log({ path, startLine, endLine, content })
  
    // Read the entire file content
    const fileContent = await Bun.file(path).text()
    const lines = fileContent.split("\n")
  
    let replacementContent = ""
    // let isEditingComplete = false

    const editedContentStream = content.pipeThrough(
      new TransformStream({
        async transform(chunk, controller) {
          // Accumulate the replacement content
          replacementContent += DECODER.decode(chunk)
          // console.log({ replacementContent, chunk })
          // Enqueue the chunk to be returned as the edited content
          controller.enqueue(chunk)
        },
        async flush() {
          // Perform the edit
          const editedLines = [
            ...lines.slice(0, startLine - 1),
            replacementContent,
            ...lines.slice(endLine)
          ]
    
          // Write the edited content back to the file
          await Bun.write(path, editedLines.join("\n"))
          // isEditingComplete = true
        }
      })
    )
  
    // Pipe the content through the transform stream
    
    return editedContentStream
  }
  
}
 
// API Handler
export class ApiHandler {
  constructor(private readonly fileSystem = new FileSystem()) {}

  async read(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new JSONPropertyStream())
    return await this.fileSystem.readFile(args)
  }

  async write(argStream: ReadableStream<Uint8Array>) {
    const args = 
    argStream
      .pipeThrough(new TransformStream({
        transform(chunk, controller){
          // console.log("\nARGSTREAM", {chunk})
          controller.enqueue(chunk)
        }
      }))
      .pipeThrough(new JSONPropertyStream())

    return await this.fileSystem.writeFile(args)
  }

  async edit(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new JSONPropertyStream()).pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // console.log("\nARGSTREAM", {chunk})
        controller.enqueue(chunk)
      }
    }))
    return await this.fileSystem.editFileLines(args)
  }

  async shell(argStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
    const keystrokes = argStream.pipeThrough(new JSONPropertyStream())
    const nodeReadable = Readable.from((async function* () {
      const reader = keystrokes.getReader()
      try {
        while (true) {
          const { done, value: { key, value } = {} } = await reader.read()
          if (done || !key || !value) {
            break
          }

          if (key === "command") {
            yield value
          }
        }
      } finally {
        reader.releaseLock()
      }
    }()))

    const bash = spawn(
      "bash",
      [],
      {
        shell: true,
        env: { ...process.env, FORCE_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"]
      }
    )

    // Pipe nodeReadable to bash.stdin
    nodeReadable.pipe(bash.stdin)

    return new ReadableStream<Uint8Array>({
      start(controller) {
        bash.stdout.on("data", (chunk) => controller.enqueue(chunk))
        bash.stderr.on("data", (chunk) => controller.enqueue(chunk))
        bash.on("close", () => {
          controller.close()
        })
        bash.on("error", (error) => {
          controller.error(error)
        })
      },
      cancel() {
        bash.kill()
      },
    })
  }
}

export interface StartServerArgs {
  cwd?: string
}

export const startServer = ({ cwd = "." }: StartServerArgs = { cwd: "." }) => {
  process.chdir(cwd)

  const apiHandler = new ApiHandler()

  return serve({
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url)
      // console.log(`${req.method} ${url.pathname} ${req.body ? "with body" : ""}`)
      // console.log({ url: url.pathname, hasBody: !!req.body, method: req.method })
      if (!request.body || request.method !== "POST") {
        console.log({ request, body: request.body })
        return new Response("Bad Request", { status: 400 })
      }

      switch (url.pathname) {
      case "/read":
        const readStream = await apiHandler.read(request.body)
        return new Response(readStream)

      case "/write":
        const writeStream = await apiHandler.write(request.body)
        return new Response(writeStream)

      case "/edit":
        const editStream = await apiHandler.edit(request.body)
        return new Response(editStream)
  
      case "/terminal":
        // console.log("TERMINAL")
        const terminalStream = await apiHandler.shell(request.body)
        return new Response(terminalStream)
  
      default:
        return new Response("Not Found", { status: 404 })
      }
    },
  })
}