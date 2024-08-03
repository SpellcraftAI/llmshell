// JSONDecoderStream must be polyfilled at the top of the context.
import "@/internals/shim"
import { IndentWrapTransform } from "@/internals/IndentWrapper"
import { JSONPropertyStream } from "@/internals/JSONPropertyStream"

import readline, { createInterface, Interface } from "readline"
import chalk from "chalk"
import ora, { type Ora } from "ora"
import boxen from "boxen"

import { streamText, tool, type CoreMessage, type ToolResultPart } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { tools } from "@/lib/tools"
import { startServer } from "@/lib/fs"
import { FileWriterStream, FileWriteTransform } from "@/internals/FileWriteStream"

Object.assign(globalThis, { readline })
const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

const model = anthropic("claude-3-5-sonnet-20240620")


class Terminal {
  private server = startServer()
  private messages: CoreMessage[] = []
  private interface: Interface | undefined

  private indent = 0

  private printYouMessage() {
    Bun.write(
      Bun.stdout,
      boxen(chalk.blue("You"), { borderColor: "blue", padding: { left: 2, right: 2 }, margin: { left: 0, right: 0, bottom: 1, top: 1 } })
    )
  }

  private printClaudeMessage() {
    Bun.write(
      Bun.stdout, 
      boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { left: 0, right: 0, top: 0, bottom: 2 } })
    )
  }

  private clearMessageOnFirstKeystroke = (data: Uint8Array) => {
    // Check if the first byte is within ASCII printable character range
    const isASCII = data[0] >= 32 && data[0] <= 126
    const isPaste = data.length > 3
  
    const isEnter = data[0] === 13
    if (isEnter) {
      process.stdout.cursorTo(0, 0)
      process.stdout.clearScreenDown()
      return
    }
  
    if (!isASCII && !isPaste) {
      return
    }
  
    // Remove the listener after the first keypress.
    process.stdin.removeListener("data", this.clearMessageOnFirstKeystroke)
  
    // Move down to the instructions line.
    process.stdout.moveCursor(0, 2)
    // Clear it.
    process.stdout.clearLine(0)
    // Return to the input line.
    process.stdout.moveCursor(0, -2)
    // Add the indent.
    process.stdout.cursorTo(this.indent)
  
    Bun.write(Bun.stdin, data)
  }

  private printStartTypingMessage() {
    const indent = " ".repeat(this.indent)
    Bun.write(Bun.stdout, chalk.dim(`\n\n\n${indent}Begin typing. Press Enter to send, Ctrl+C to exit.`))
    process.stdin.on("data", this.clearMessageOnFirstKeystroke)
    process.stdout.moveCursor(0, -2)
    process.stdout.cursorTo(this.indent)
  }

  refresh() {
    this.interface?.close()
    this.printYouMessage()

    const userTextMessages: CoreMessage[] = 
      this.messages
        .filter(({ role }) => role === "user")
        .filter(({ content }) => typeof content === "string")
        .reverse()

    this.interface = createInterface({
      input: process.stdin,
      output: process.stdout,
      history: userTextMessages.map(({ content }) => content as string),
      tabSize: 2,
    })

    this.interface.on("SIGINT", () => this.stop())
    this.printStartTypingMessage()
    return this.interface
  }

  stop() {
    this.server.stop()
    process.stdout.moveCursor(0, 2)
    process.stdout.write("\n\n")
    process.stdout.clearLine(0)
    this.interface?.close()
    process.exit()
  }

  async readline() {
    return new Promise<void>((resolve) => {
      this.refresh()
      this.interface?.on("line", async (line) => {
        await this.submit(line)
        resolve()
      })
    })
  }

  async run() {
    while (true) {
      await this.readline()
    }
  }

  async submit(line: string) {
    if (line.length === 0) {
      throw new Error("Tried to submit empty message.")
    }

    Bun.write(Bun.stdout, "\n")

    this.messages.push({ role: "user", content: line })
    const { fullStream, toolCalls, toolResults } = await streamText({
      model,
      messages: this.messages,
      tools,
      experimental_toolCallStreaming: true,
      maxTokens: 4096
    })

    let firstTextChunk = true

    /**
     * Load the tool arg stream, printing as we load text deltas and new tool
     * calls.
     */
    const toolStream = 
    fullStream
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller: TransformStreamDefaultController<Uint8Array>) => {
            switch (chunk.type) {
            case "text-delta":
              if (firstTextChunk) {
                firstTextChunk = false
                // clear the line
                process.stdout.clearLine(0)
                // move the cursor back to offset the spinner indent
                process.stdout.moveCursor(-this.indent, 0)
                
                this.printClaudeMessage()
              }
              Bun.write(Bun.stdout, chunk.textDelta)
              break

            case "tool-call-streaming-start":
              Bun.write(Bun.stdout, "\n")
              Bun.write(
                Bun.stdout,
                boxen(
                  chunk.toolName, 
                  { title: chalk.dim(chalk.yellow("Tool")), borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
                )
              )
              break

            case "tool-call-delta":
              controller.enqueue(ENCODER.encode(chunk.argsTextDelta))
              break
            }
          }
        })
      )
      .pipeThrough(new JSONPropertyStream())

    let currentKey: string | null = null
    await toolStream
      .pipeThrough(
        new TransformStream({
          transform({ key, value }, controller: TransformStreamDefaultController<Uint8Array>) {
            if (key !== currentKey) {
              currentKey = key
              controller.enqueue(ENCODER.encode(boxen(
                chalk.dim(chalk.yellow(key)), 
                { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
              )))
            }
            
            if (typeof value === "string") {
              controller.enqueue(ENCODER.encode(value))
            } else if (value instanceof Uint8Array) {
              controller.enqueue(value)
            } else {
              controller.enqueue(ENCODER.encode(JSON.stringify(value)))
            }
          }
        })
      )
      .pipeTo(new FileWriterStream(Bun.stdout))

    Bun.write(Bun.stdout, "\n")

    const [finishedCalls, finishedResults] = await Promise.all([toolCalls, toolResults])
    if (finishedResults.length > 0) {
      this.messages.push({ role: "assistant", content: finishedCalls })

      Bun.write(Bun.stdout, "\n")
      Bun.write(
        Bun.stdout,
        boxen(
          chalk.dim(chalk.yellow("Output")), 
          { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
        )
      )
      Bun.write(Bun.stdout, "\n\n")

      const toolResultBuffers: ToolResultPart[] = []

      await Promise.all(
        finishedResults.map(async (finishedResult) => {
          /**
           * We will pipe the result stream to stdout, but we also want to store
           * it in a buffer to add as a tool result.
           */
          let resultBuffer = ""

          const { result } = finishedResult
          await result
            ?.pipeThrough(new TransformStream({
              transform(chunk, controller) {
                resultBuffer += DECODER.decode(chunk)
                controller.enqueue(chunk)
              }
            }))
            ?.pipeTo(new FileWriterStream(Bun.stdout))
            
          toolResultBuffers.push({ ...finishedResult, result: resultBuffer })
        })
      )

      this.messages.push({ role: "tool", content: toolResultBuffers })
      Bun.write(Bun.stdout, "\n")
    }
  }
}

const terminal = new Terminal()
await terminal.run()
