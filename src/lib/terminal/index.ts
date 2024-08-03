// JSONDecoderStream must be polyfilled at the top of the context.
import "@/internals/shim"
import { IndentWrapTransform } from "@/internals/IndentWrapper"
import { JSONPropertyStream } from "@/internals/JSONPropertyStream"

import readline, { createInterface, Interface } from "readline"
import chalk from "chalk"
import ora, { type Ora } from "ora"
import boxen from "boxen"

import { streamText, type CoreMessage, type ToolResultPart } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { tools } from "@/lib/tools"
import { startServer } from "@/lib/fs"
import { clearMessageOnFirstKeystroke } from "./utils"

Object.assign(globalThis, { readline })
const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

const model = anthropic("claude-3-5-sonnet-20240620")
export const terminal = async (): Promise<void> => {
  const server = startServer()
  const messages: CoreMessage[] = []

  const submitMessage = async (content: string): Promise<void> => {
    if (!content.trim()) {
      return
    }

    Bun.write(Bun.stdout, "\n")
    const spinner: Ora = ora({ text: "Loading...\n\n", spinner: "dots", indent: 2 }).start()
    
    messages.push({ role: "user", content })
    const { fullStream, toolCalls, toolResults } = await streamText({
      model,
      messages,
      tools,
      experimental_toolCallStreaming: true,
      maxTokens: 4096
    })
    
    let isFirstChunk = true
    let textResponse = ""

    const stdoutIndent = new IndentWrapTransform(2, Math.min(80, process.stdout.columns - 4))
    stdoutIndent.pipe(process.stdout)

    // const toolBuffers = new Map<string, string>()
    // const toolBufferProperties = new Map<string, Set<string>>()

    let currentKey: string | null = null

    const toolArgsStream = new JSONPropertyStream()
    const toolArgsReader = toolArgsStream.readable.getReader()
    const toolArgsWriter = toolArgsStream.writable.getWriter()

    async function handleToolArgsOutput() {
      while (true) {
        const { done, value: result } = await toolArgsReader.read()
        if (done) break
        if (!result) break
    
        const { key, value } = result
        // console.log("HANDLETOOLARGS", { key, value })
    
        if (key !== currentKey) {
          currentKey = key
          console.log("\n")
          // process.stdout.write("\n")
          process.stdout.write(
            boxen(
              chalk.dim(chalk.yellow(key)),
              { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
            )
          )
          process.stdout.write("\n")
        }
    
        process.stdout.write(String(value))
      }

      process.stdout.write("\n")
    }
    
    async function handleStream() {
      for await (const chunk of fullStream) {
        if (isFirstChunk) {
          isFirstChunk = false
          spinner.stop()
          process.stdout.clearLine(0)
          process.stdout.cursorTo(0)
  
          Bun.write(
            Bun.stdout, 
            boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { left: 1, right: 1 } }) + "\n"
          )
        }
  
        switch (chunk.type) {
        case "text-delta": {
          stdoutIndent.write(chunk.textDelta)
          textResponse += chunk.textDelta
          break
        }
  
        case "tool-call":
          break
  
        case "finish":
          stdoutIndent._flush()
          break
  
        case "tool-call-streaming-start":
          stdoutIndent._flush()
  
          process.stdout.write("\n\n")
          process.stdout.write(chalk.dim("─".repeat(Math.min(80, process.stdout.columns - 2))))
          console.log()
          process.stdout.write(
            boxen(
              chalk.dim(chalk.yellow(chunk.toolName)), 
              { title: "Tool", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
            )
          )
  
          break
  
        case "tool-call-delta":
          await toolArgsWriter.write(ENCODER.encode(chunk.argsTextDelta))
          break
        }
      }

      await toolArgsWriter.close()
    }

    await Promise.all([handleStream(), handleToolArgsOutput()])
    process.stdout.write("\n")

    const finishedCalls = await toolCalls
    const finishedResults = await toolResults

    // console.log("PROMISES RESOLVED")

    if (finishedCalls.length > 0) {
      messages.push({ role: "assistant", content: finishedCalls })
    }

    const flushedResults: ToolResultPart[] = []
    for (const toolResult of finishedResults) {
      if (!toolResult.result) continue

      let content = ""
      
      process.stdout.write("\n")
      process.stdout.write(
        boxen(
          chalk.dim(chalk.yellow(toolResult.toolName)), 
          { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
        )
      ) 
      console.log()
      // process.stdout.write("\n")

      switch (toolResult.toolName) {
      case "terminal":
      case "read":
      case "write":
      case "edit":
        const reader = toolResult.result.getReader()
        // console.log("FINISHEDRESULT STREAM")
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = DECODER.decode(value)
          Bun.write(Bun.stdout, value)
          content += text
        }
        
        flushedResults.push({ ...toolResult, result: content })
        break
      }

      process.stdout.write("\n")
    }
    
    if (flushedResults.length > 0) {
      messages.push({ role: "tool", content: flushedResults })
    }
    
    messages.push({ role: "assistant", content: textResponse })
  }

  process.on("exit", () => {
    server.stop()
  })

  const readlines = async () => {
    const userTextMessages: CoreMessage[] = 
      messages
        .filter(({ role }) => role === "user")
        .filter(({ content }) => typeof content === "string")
        .reverse()

    const rl: Interface = createInterface({
      input: process.stdin,
      output: process.stdout,
      history: userTextMessages.map(({ content }) => content as string),
      tabSize: 2,
    })

    rl.addListener("SIGINT", () => {
      process.stdout.moveCursor(0, 2)
      process.stdout.write("\n\n")
      process.stdout.clearLine(0)
      // process.stdout.write("\n");
      rl.close()
      process.exit()
    })

    await new Promise<void>((resolve) => {
      process.stdout.write("\n")
      process.stdout.write(boxen(chalk.blue("You"), { borderColor: "blue", padding: { left: 2, right: 2 }, margin: { left: 1, right: 1 } }))
      process.stdout.write("\n  ")
      rl.on(
        "line", 
        async (content: string) => {
          rl.close()
          await submitMessage(content)
          resolve()
        }
      )

      process.stdin.on("data", clearMessageOnFirstKeystroke)
      Bun.write(Bun.stdout, chalk.dim("\n\n\n  Begin typing. Press Enter to send, Ctrl+C to exit."))
      process.stdout.moveCursor(0, -2)
      process.stdout.cursorTo(2)
    })
  }

  while (true) {
    await readlines()
  }
}