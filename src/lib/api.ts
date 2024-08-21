import { serve } from "bun"
import { spawn } from "child_process"
import { Readable } from "stream"
import { JSONPropertyStream, type JSONPropertyChunk } from "@/internals/JSONPropertyStream"
import { parseContentStream } from "@/internals/parseContentStream"
import { FileWriterStream } from "@/internals/FileWriteStream"

// const ENCODER = new TextEncoder()
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

  async writeFile(argStream: ReadableStream<JSONPropertyChunk>) {
    const { path, content } = await parseContentStream(argStream)
    const file = Bun.file(path)
    // Clear file
    await Bun.write(file, "")
    // Each chunk is written to file as it is streamed back
    await content.pipeTo(new FileWriterStream(file))
    return null
  }

  async editFileLines(argChunks: ReadableStream<JSONPropertyChunk>): Promise<ReadableStream<Uint8Array>> {
    // Parse the input stream to extract file editing parameters
    const { path, startLine, endLine, content } = await parseContentStream(argChunks)
    // console.log({ path, startLine, endLine, content })
  
    // Read the entire file content
    const fileContent = await Bun.file(path).text()
    const lines = fileContent.split("\n")
  
    let replacementContent = ""

    return content.pipeThrough(
      new TransformStream({
        async transform(chunk, controller) {
          // Accumulate the replacement content
          replacementContent += DECODER.decode(chunk, { stream: true })
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
        }
      })
    )
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
    const args = argStream.pipeThrough(new JSONPropertyStream())
    return await this.fileSystem.writeFile(args)
  }

  async edit(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new JSONPropertyStream())
    return await this.fileSystem.editFileLines(args)
  }

  async shell(argStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
    const keystrokes = argStream.pipeThrough(new JSONPropertyStream())
    const commandStream = keystrokes.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const { key, value } = chunk
          if (key === "command") {
            controller.enqueue(value)
          }
        }
      })
    )

    /**
     * Can't use Bun.spawn because no way to join the stdout and sterr streams
     * while streaming. Any method of joining the ReadableStreams will require
     * acquiring readers, which blocks the stream and yields only one chunk from
     * Response.
     */

    // const bash = Bun.spawn(["bash"], {
    //   stdio: ["pipe", "pipe", "pipe"],
    //   env: { ...process.env, FORCE_COLOR: "1" }
    // })

    // await commandStream.pipeTo(new FileSinkWriter(bash.stdin))
    // await bash.stdout.pipeTo(new FileWriterStream(Bun.stdout))

    const bash = spawn(
      "bash",
      [],
      {
        shell: true,
        env: { ...process.env, FORCE_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"]
      }
    )

    // Pipe provided input to bash.stdin
    Readable.fromWeb(commandStream as unknown as import("stream/web").ReadableStream).pipe(bash.stdin)

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
    port: 3000,
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
        const terminalStream = await apiHandler.shell(request.body)
        return new Response(terminalStream)
  
      default:
        return new Response("Not Found", { status: 404 })
      }
    },
  })
}