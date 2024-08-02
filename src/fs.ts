import { serve, type BunFile } from "bun"
import { spawn } from "child_process"
import { Readable } from "stream"
import { StreamingToolArgs, type ToolArgChunk } from "./StreamingToolArgs"
import { parseContentStream } from "./parseContentStream"
import { FileWriteStream } from "./FileWriteStream"

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

export type FileOperationType = "read" | "write" | "edit";

export interface FileOperation {
  operation: FileOperationType;
  path: string;
  content?: string;
  startLine?: number;
  endLine?: number;
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let result = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += new TextDecoder().decode(value)
  }
  return result
}

// File System Operations
export class FileSystem {
  async readFile(argChunks: ReadableStream<ToolArgChunk>) {
    const reader = argChunks.getReader()

    let path: string | undefined
    while (true) {
      const { done, value: { key, value } = {} } = await reader.read()
      if (done) break

      if (key === "path") {
        if (!path) {
          path = value
        } else {
          path += value
        }
      }
    }

    if (!path) {
      throw new Error("No file path provided in the argument stream")
    }

    const file = Bun.file(path)
    return file.stream()
  }

  async writeFile(argStream: ReadableStream<ToolArgChunk>): Promise<ReadableStream<Uint8Array>> {
    try {
      const { path, content } = await parseContentStream(argStream)

      const file = Bun.file(path)
      const writeToFile = new FileWriteStream(file)
      return content.pipeThrough(writeToFile)
  
      // return content
      // return content.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      //   transform(chunk, controller) {
      //     console.log("CHUNK", DECODER.decode(chunk))
      //     controller.enqueue(ENCODER.encode(DECODER.decode(chunk)))
      //   },
      // }))
    } catch (e) {
      console.error(e)
      throw new Error("Failed to write")
    }

    // const file = Bun.file(path)
    // await Bun.write(file, "")
    
    // const fileWriteStream = new FileWriteStream(file)
    // return content.pipeThrough(fileWriteStream)
  }

  async editFileLines(argChunks: ReadableStream<ToolArgChunk>): Promise<ReadableStream<Uint8Array>> {
    // Parse the input stream to extract file editing parameters
    const { path, startLine, endLine, content } = await parseContentStream(argChunks)
    // console.log({ path, startLine, endLine, content })
  
    // Read the entire file content
    const fileContent = await Bun.file(path).text()
    const lines = fileContent.split("\n")
  
    let replacementContent = ""
    // let isEditingComplete = false
  
    const editingTransform = new TransformStream<Uint8Array, Uint8Array>({
      async transform(chunk, controller) {
        // Accumulate the replacement content
        replacementContent += DECODER.decode(chunk)
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
  
    // Pipe the content through the transform stream
    const editedContentStream = content.pipeThrough(editingTransform)
    return editedContentStream
  
    // Create a new stream that waits for the editing to complete before closing
    // return new ReadableStream({
    //   async start(controller) {
    //     const reader = editedContentStream.getReader()
    //     while (true) {
    //       const { done, value } = await reader.read()
    //       if (done) break
    //       controller.enqueue(value)
    //     }
    //     // Wait for the file writing to complete before closing the stream
    //     // while (!isEditingComplete) {
    //     //   continue
    //     // }
    //     controller.close()
    //   }
    // })
  }
  
}

export type FileOperationResult = { 
  success: boolean; 
  message: string; 
  data?: string 
};

// API Handler
export class ApiHandler {
  constructor(private readonly fileSystem = new FileSystem()) {}

  async read(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new StreamingToolArgs())
    return await this.fileSystem.readFile(args)
  }

  async write(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new StreamingToolArgs())
    return await this.fileSystem.writeFile(args)
  }

  async edit(argStream: ReadableStream<Uint8Array>) {
    const args = argStream.pipeThrough(new StreamingToolArgs())
    return await this.fileSystem.editFileLines(args)
  }

  async shell(argStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
    const keystrokes = argStream.pipeThrough(new StreamingToolArgs())
    const nodeReadable = Readable.from((async function* () {
      const reader = keystrokes.getReader()
      try {
        while (true) {
          const { done, value: { key, value } = {} } = await reader.read()
          if (done) {
            break
          }

          if (!key || !value) {
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
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url)
      // console.log(`${req.method} ${url.pathname} ${req.body ? "with body" : ""}`)
      // console.log({ url: url.pathname, hasBody: !!req.body, method: req.method })
      if (!req.body || req.method !== "POST") {
        return new Response("Bad Request", { status: 400 })
      }

      switch (url.pathname) {
      case "/read":
        const readStream = await apiHandler.read(req.body)
        return new Response(readStream)

      case "/write":
        const writeStream = await apiHandler.write(req.body)
        return new Response(writeStream)

      case "/edit":
        const editStream = await apiHandler.edit(req.body)
        return new Response(editStream)
  
      case "/terminal":
        const terminalStream = await apiHandler.shell(req.body)
        return new Response(terminalStream)
  
      default:
        return new Response("Not Found", { status: 404 })
      }
    },
  })
}