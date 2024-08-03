import "@/internals/shim"

import { createInterface, Interface } from "readline"
import chalk from "chalk"
import ora from "ora"
import boxen from "boxen"
import { streamText, CoreMessage, ToolResultPart } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { tools } from "@/lib/tools"
import { startServer } from "@/lib/fs"
import { IndentWrapTransform } from "@/internals/IndentWrapper"
import { JSONPropertyStream } from "@/internals/JSONPropertyStream"

class Terminal {
  private messages: CoreMessage[] = []
  private rl: Interface
  private model = anthropic("claude-3-5-sonnet-20240620")
  private server: ReturnType<typeof startServer>

  constructor() {
    this.server = startServer()
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      historySize: 1000,
      tabSize: 2,
    })
  }

  async start(): Promise<void> {
    process.on("exit", () => this.server.stop())
    while (true) {
      await this.readUserInput()
    }
  }

  private async readUserInput(): Promise<void> {
    return new Promise((resolve) => {
      this.displayPrompt()
      this.rl.once("line", async (content: string) => {
        if (content.trim()) {
          await this.processUserMessage(content)
        }
        resolve()
      })
    })
  }

  private displayPrompt(): void {
    console.log(boxen(chalk.blue("You"), { borderColor: "blue", padding: { left: 2, right: 2 }, margin: { left: 1, right: 1 } }))
    process.stdout.write("  ")
  }

  private async processUserMessage(content: string): Promise<void> {
    this.messages.push({ role: "user", content })
    const spinner = ora({ text: "Loading...\n\n", spinner: "dots", indent: 2 }).start()

    const { fullStream, toolCalls, toolResults } = await streamText({
      model: this.model,
      messages: this.messages,
      tools,
      experimental_toolCallStreaming: true,
      maxTokens: 4096
    })

    spinner.stop()
    await this.handleResponseStream(fullStream)
    await this.processToolResults(await toolResults)

    const finishedCalls = await toolCalls
    if (finishedCalls.length > 0) {
      this.messages.push({ role: "assistant", content: finishedCalls })
    }
  }

  private async handleResponseStream(stream: AsyncIterable<any>): Promise<void> {
    const stdoutIndent = new IndentWrapTransform(2, Math.min(80, process.stdout.columns - 4))
    stdoutIndent.pipe(process.stdout)

    let isFirstChunk = true
    let textResponse = ""

    for await (const chunk of stream) {
      if (isFirstChunk) {
        this.displayAssistantHeader()
        isFirstChunk = false
      }

      switch (chunk.type) {
      case "text-delta":
        stdoutIndent.write(chunk.textDelta)
        textResponse += chunk.textDelta
        break
      case "tool-call-streaming-start":
        this.displayToolCallHeader(chunk.toolName)
        break
      case "tool-call-delta":
        // Handle tool call streaming
        break
      }
    }

    this.messages.push({ role: "assistant", content: textResponse })
    stdoutIndent.end()
  }

  private async processToolResults(results: ToolResultPart[]): Promise<void> {
    for (const result of results) {
      if (!result.result) continue

      this.displayToolResultHeader(result.toolName)

      if (result.toolName === "terminal" || result.toolName === "read" || result.toolName === "write" || result.toolName === "edit") {
        const content = await this.streamToolResult(result.result)
        this.messages.push({ role: "tool", content: [{ ...result, result: content }] })
      }
    }
  }

  private async streamToolResult(stream: ReadableStream): Promise<string> {
    const reader = stream.getReader()
    let content = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = new TextDecoder().decode(value)
      process.stdout.write(text)
      content += text
    }
    return content
  }

  private displayAssistantHeader(): void {
    console.log(boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { left: 1, right: 1 } }))
  }

  private displayToolCallHeader(toolName: string): void {
    console.log("\n" + chalk.dim("─".repeat(Math.min(80, process.stdout.columns - 2))))
    console.log(boxen(chalk.dim(chalk.yellow(toolName)), { title: "Tool", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }))
  }

  private displayToolResultHeader(toolName: string): void {
    console.log("\n" + boxen(chalk.dim(chalk.yellow(toolName)), { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }))
  }
}

// Usage
const terminal = new Terminal()
terminal.start()