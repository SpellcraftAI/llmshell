// JSONDecoderStream must be polyfilled at the top of the context.
import "@/internals/shim"
import { IndentWrapTransform } from "@/internals/IndentWrapper"
import { JSONPropertyStream } from "@/internals/JSONPropertyStream"

import { createInterface, Interface } from "readline"
import styles from "ansi-styles"
import chalk from "chalk"
import ora, { type Ora } from "ora"
import boxen from "boxen"

import { streamText, tool, type AssistantContent, type CoreMessage, type ToolResultPart } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { tools } from "@/lib/tools"
import { startServer } from "@/lib/api"
import { FileWriterStream, FileWriterTransform } from "@/internals/FileWriteStream"
import { BufferStream } from "@/internals/BufferStream"

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

    const { fullStream, textStream, toolCalls, toolResults } = await streamText({
      model,
      messages: this.messages,
      tools,
      experimental_toolCallStreaming: true,
      maxTokens: 4096
    })
  
    // const [textStreamFork, textBufferFork] = textStream.tee()
    const [toolCallFork, toolArgsFork] = fullStream.tee()

    this.printClaudeMessage()

    const streamToStdin = textStream.pipeThrough(new FileWriterTransform(Bun.stdout))
    const textResponse = await new Response(streamToStdin).text()
        
    // await Promise.all([
    //   /**
    //    * Stream text response to stdout.
    //    */
    //   textStreamFork.pipeTo(new FileWriterStream(Bun.stdout)),
    //   /**
    //    * Add the response to messages.
    //    */
    //   new Response(textBufferFork).text().then((content) => {
    //     this.messages.push({ role: "assistant", content })
    //   }),
    // ])

    // console.log(this.messages)

    /**
     * Transform that yields tool calls.
     */
    const toolCallStream = toolCallFork.pipeThrough(
      new TransformStream({
        async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
          switch (chunk.type) {
          case "tool-call-streaming-start":
            controller.enqueue(ENCODER.encode("\n"))
            controller.enqueue(
              ENCODER.encode(
                boxen(
                  chalk.dim(chunk.toolName), 
                  { title: chalk.dim("Tool"), borderColor: "gray", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
                ),
              )
            )
            break
          }
        }
      })
    )

    let lastKey: string | null = null
    const toolArgsStream = toolArgsFork.pipeThrough(
      new TransformStream({
        async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
          switch(chunk.type) {
          case "tool-call-delta":
            // await new Promise((resolve) => setTimeout(resolve, 500))
            controller.enqueue(ENCODER.encode(chunk.argsTextDelta))
            break
          }
        }
      })
    ).pipeThrough(
      new JSONPropertyStream()
    ).pipeThrough(
      new TransformStream({
        transform({ key, value }, controller: TransformStreamDefaultController<Uint8Array>) {
          if (key !== lastKey) {
            lastKey = key
            const argsBox = boxen(
              chalk.dim(chalk.yellow(key)), 
              { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 0 }, dimBorder: true }
            )

            controller.enqueue(ENCODER.encode(argsBox))
            controller.enqueue(ENCODER.encode("\n"))
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

    await Promise.all([
      toolCallStream.pipeTo(new FileWriterStream(Bun.stdout)),
      toolArgsStream.pipeTo(new FileWriterStream(Bun.stdout))
    ])

    await Bun.write(Bun.stdout, "\n")

    const [finishedCalls, finishedResults] = await Promise.all([toolCalls, toolResults])
    const usedTools = finishedCalls.length > 0

    if (!usedTools) {
      this.messages.push({ role: "assistant", content: textResponse })
      return
    }

    // console.log({ finishedCalls, finishedResults })

    const bufferedResults: ToolResultPart[] = []
    for (const toolResult of finishedResults) {
      if (!toolResult.result) continue

      await Bun.write(Bun.stdout, boxen(
        chalk.dim(chalk.yellow(toolResult.toolName)), 
        { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
      ))

      const streamToStdout = toolResult.result.pipeThrough(new FileWriterTransform(Bun.stdout))
      const result = await new Response(streamToStdout).text()
      bufferedResults.push({ ...toolResult, result })
    }

    this.messages.push(
      { role: "assistant", content: [{ type: "text", text: textResponse }, ...finishedCalls] },
      { role: "tool", content: bufferedResults },
    )
  }
}

const terminal = new Terminal()
await terminal.run()
