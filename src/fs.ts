import { serve } from "bun"
import { spawn } from "child_process"
import { Readable } from "stream"
import { StreamingToolArgs } from "./StreamingToolArgs"

const ENCODER = new TextEncoder()

export type FileOperationType = "read" | "write" | "edit";

export interface FileOperation {
  operation: FileOperationType;
  path: string;
  content?: string;
  startLine?: number;
  endLine?: number;
}

// File System Operations
export class FileSystem {
  async readFile(path: string) {
    return await Bun.file(path).text()
  }

  async writeFile(path: string, content: string) {
    await Bun.write(path, content)
    return content
  }

  async editFileLines(
    path: string, 
    content: string, 
    startLine: number, 
    endLine: number
  ) {
    const fileContent = await this.readFile(path)
    const lines = fileContent.split("\n")
    const newLines = [
      ...lines.slice(0, startLine - 1),
      content,
      ...lines.slice(endLine)
    ]

    const withEdit = newLines.join("\n")
    await this.writeFile(path, withEdit)
    return content
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

  async file({ operation, path, content, startLine, endLine }: FileOperation) {
    try {
      let message: string
      let data: string | undefined

      switch (operation) {
      case "read":
        data = await this.fileSystem.readFile(path)
        message = `File ${path} read successfully`
        break

      case "write":
        data = await this.fileSystem.writeFile(path, content!)
        message = `File ${path} updated successfully`
        break

      case "edit":
        if (content === undefined || startLine === undefined || endLine === undefined) {
          throw new Error("content, startLine, endLine required for edit operation")
        } 

        data = await this.fileSystem.editFileLines(path, content, startLine, endLine)
        message = `Lines ${startLine}-${endLine} in ${path} updated successfully`
        break

      default:
        if (!operation) {
          throw new Error("operation required")
        }
        throw new Error(`Invalid operation: ${operation}`)
      }

      return { success: true, message, data }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  async bashTest(argStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
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


  async bash(command: string): Promise<ReadableStream<Uint8Array>> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const bash = spawn(
          "bash", 
          ["-c", command], 
          { 
            shell: false,
            env: { ...process.env, FORCE_COLOR: "1" } 
          }
        )

        bash.stdout.on("data", (data) => {
          controller.enqueue(data)
        })

        bash.stderr.on("data", (data) => {
          controller.enqueue(data)
        })

        bash.on("close", (code) => {
          if (code !== 0) {
            controller.enqueue(ENCODER.encode(`Process exited with code ${code}\n`))
          }
          controller.close()
        })

        bash.on("error", (err) => {
          controller.error(err)
        })
      }
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
      if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 })
      }
  
      const url = new URL(req.url)
  
      switch (url.pathname) {
      case "/file": {
        const result = await apiHandler.file(await req.json() as FileOperation)
        return new Response(
          JSON.stringify(result), 
          {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          }
        )
      }
  
      case "/terminal":
        if (req.body === null) {
          return new Response("Bad Request", { status: 400 })
        }
      
        const stream = await apiHandler.bashTest(req.body)
        // console.log("LOCKED", stream.locked)
        return new Response(
          stream, 
          {
            headers: { "Content-Type": "text/plain" }
          }
        )

  
      default:
        return new Response("Not Found", { status: 404 })
      }
    },
  })
}