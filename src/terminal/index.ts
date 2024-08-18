// JSONDecoderStream must be polyfilled at the top of the context.
import "@/internals/shim"
import { IndentTransform } from "@/internals/Indent"
import { JSONPropertyStream } from "@/internals/JSONPropertyStream"

import { createInterface, Interface } from "readline"
import { streamText, type CoreMessage, type ToolResultPart } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { tools } from "@/lib/tools"
import { startServer } from "@/lib/api"
import { FileWriterStream, FileWriterTransform } from "@/internals/FileWriteStream"

import chalk from "chalk"
import boxen from "boxen"
import style from "ansi-styles"
import { StringConsole } from "@/internals/stringConsole"
import { StreamingLexer } from "@/internals/test"
import { MarkdownANSIStream } from "/Users/lewis/Development/streaming-markdown/dist/index.js"

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

const model = anthropic("claude-3-5-sonnet-20240620")

const stringConsole = new StringConsole()

const SYSTEM_PROMPT = `
You interface with the user's computer system. 
Use Markdown formatting for your text responses.
You don't need to use tools to write Markdown.

USER: ...

ASSISTANT: ...

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

**Bold Text**
*Italic Text*
...
`.trim()

export class Terminal {
  private server = startServer()
  private messages: CoreMessage[] = []
  private interface: Interface | undefined
  private roundtrip = 0
  private maxRoundtrips = 5

  private indent = 2

  private async printYouMessage() {
    await Bun.write(
      Bun.stdout,
      boxen(chalk.blue("You"), { borderColor: "blue", padding: { left: 2, right: 2 }, margin: { left: 1, right: 0, top: 1, bottom: 1 } })
    )
  }

  private async printClaudeMessage() {
    await Bun.write(
      Bun.stdout, 
      boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { left: 1, right: 0, top: 1, bottom: 2 } })
    )
  }

  private clearMessageOnFirstKeystroke = async (data: Uint8Array) => {
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
  
    await Bun.write(Bun.stdin, data)
  }

  private async printStartTypingMessage() {
    const indent = " ".repeat(this.indent)
    await Bun.write(Bun.stdout, chalk.dim(`\n\n\n${indent}Begin typing. Press Enter to send, Ctrl+C to exit.`))
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
    if (line.trim().length === 0) {
      return
    }

    this.messages.push({ role: "user", content: line })
    this.printClaudeMessage()
    return await this.stream()
  }

  /**
   * Send the current messages to the model and display the response.
   */
  async stream() {
    if (this.roundtrip > 0) {
      await Bun.write(
        Bun.stdout,
        boxen(
          `${this.roundtrip} of ${this.maxRoundtrips}`, 
          { title: "Roundtrip", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { left: 1, top: 1, bottom: 2 } }
        )
      )
    }

    const { fullStream, textStream, toolCalls, toolResults, usage } = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: this.messages,
      tools,
      experimental_toolCallStreaming: true,
      maxTokens: 4096
    })

    // const textStream = new ReadableStream<Uint8Array>({
    //   async start(controller) {
    //     const reader = A.getReader()
    //     while (true) {
    //       const { done, value } = await reader.read()
    //       if (done) break
          
    //       if (value.type === "text-delta") {
    //         controller.enqueue(ENCODER.encode(value.textDelta))
    //       } else {
    //         controller.close()
    //       }
    //     }
    //   }
    // })

    // await textStream.pipeTo(new FileWriterStream(Bun.stdout))
     
    const [textLogStream, textBufferStream] = textStream.tee()
    const withFormatting = 
      textLogStream
        .pipeThrough(new TextEncoderStream())
        .pipeThrough(new MarkdownANSIStream(1))
        .pipeThrough(new IndentTransform())

    await withFormatting.pipeTo(new FileWriterStream(Bun.stdout))
    const textResponse = await new Response(textBufferStream).text()

    // Failsafe to ensure last chunk displays.
    // await new Promise((resolve) => setTimeout(resolve, 200))
    // await Bun.write(Bun.stdout, "\n")
    // return

    // console.log(this.messages)
    // const [toolCallFork, toolArgsFork] = fullStream.tee()

    let lastKey: string | null = null
    const toolsStream = fullStream.pipeThrough(
      new TransformStream({
        async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
          switch(chunk.type) {
          case "tool-call-streaming-start":
            // controller.enqueue(ENCODER.encode("\n"))
            await Bun.write(
              Bun.stdout,
              ENCODER.encode(boxen(chalk.bold(chunk.toolName), { title: "Tool", margin: { left: 1, top: 2 }, padding: { left: 1, right: 1 } }))
              // ENCODER.encode(
              //   boxen(
              //     chunk.toolName, 
              //     { title: "Tool", borderColor: "gray", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 } }
              //   ),
              // )
            )
            break

          case "tool-call-delta":
            controller.enqueue(ENCODER.encode(chunk.argsTextDelta))
            break
          }
        }
      })
    ).pipeThrough(
      new JSONPropertyStream()
    ).pipeThrough(
      new TransformStream({
        async transform({ key, value }, controller: TransformStreamDefaultController<Uint8Array>) {
          // console.log({ key, value })
          if (key !== lastKey) {
            lastKey = key
            // const argsBox = boxen(
            //   chalk.dim(chalk.yellow(key)), 
            //   { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
            // )

            controller.enqueue(ENCODER.encode("\n\n"))
            controller.enqueue(ENCODER.encode(chalk.bold.dim(key)))
            controller.enqueue(ENCODER.encode("\n"))
            // controller.enqueue(ENCODER.encode(style.dim.open))
          }

          if (typeof value === "string") {
            controller.enqueue(ENCODER.encode(chalk.dim(value)))
          } else if (value instanceof Uint8Array) {
            controller.enqueue(value)
          } else {
            controller.enqueue(ENCODER.encode(chalk.dim(JSON.stringify(value))))
          }
        },
      })
    ).pipeThrough(
      new IndentTransform(2, process.stdout.columns - 2)
    )

    await toolsStream.pipeTo(new FileWriterStream(Bun.stdout))
    await Bun.write(Bun.stdout, "\n")

    const [finishedCalls, finishedResults] = await Promise.all([toolCalls, toolResults])
    const usedTools = finishedCalls.length > 0

    if (!usedTools) {
      this.roundtrip = 0
      this.messages.push({ role: "assistant", content: textResponse })
      return
    }

    this.roundtrip += 1

    // console.log({ finishedCalls, finishedResults })

    const bufferedResults: ToolResultPart[] = []
    for (const toolResult of finishedResults) {
      if (!toolResult.result) continue

      let firstChunk = true
      const streamToStdout = toolResult.result.pipeThrough(
        new TransformStream({
          async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
            // if (!firstChunk) {
            // firstChunk = true
            // controller.enqueue(
            //   ENCODER.encode(
            //     boxen(
            //       chalk.dim(chalk.yellow(toolResult.toolName)), 
            //       { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 0 }, dimBorder: true }
            //     )
            //   )
            // )

            // const toolOutputMetadata = boxen(
            //   chalk.dim(chalk.yellow(toolResult.toolName)), 
            //   { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
            // )

            // const outputArgsMetadata = boxen(
            //   chalk.dim(consoleTable(toolResult.args)), 
            //   { title: "Args", borderColor: "yellow", padding: { left: 4, right: 4 }, margin: { top: 1, bottom: 1 }, dimBorder: true }
            // )

            // controller.enqueue(ENCODER.encode("\n\n"))
            // for (const [arg, value] of Object.entries(toolResult.args)) {
            //   const table = stringConsole.table({ arg, value })
            //   controller.enqueue(ENCODER.encode(chalk.yellow.dim(table)))
            //   controller.enqueue(ENCODER.encode("\n"))

            //   // controller.enqueue(ENCODER.encode("\n"))
            //   // controller.enqueue(ENCODER.encode(chalk.bold(chalk.dim(arg.trim())) + "\n"))
            //   // controller.enqueue(ENCODER.encode(chalk.dim(value.toString().trim())))
            //   // controller.enqueue(ENCODER.encode("\n\n"))
            //   // controller.enqueue(ENCODER.encode("\n"))
            // }

              
            // const toolOutputMetadata;

            // controller.enqueue(ENCODER.encode(toolOutputMetadata))
            // controller.enqueue(ENCODER.encode(outputArgsMetadata))
              
            // controller.enqueue(ENCODER.encode(chalk.bold(toolResult.toolName) + "\n"))
            // controller.enqueue(ENCODER.encode(chalk.dim(consoleTable(toolResult.args))))
            // controller.enqueue(ENCODER.encode("\n\n"))

            // controller.enqueue(ENCODER.encode(style.dim.open))
            // }

            if (firstChunk) {
              controller.enqueue(ENCODER.encode(chalk.bold.dim("Stdout")))
              controller.enqueue(ENCODER.encode("\n"))
            }

            controller.enqueue(chunk)
          },

          flush(controller) {
            controller.enqueue(ENCODER.encode("\n"))
          }
        })
      ).pipeThrough(
        new IndentTransform()
      ).pipeThrough(
        new FileWriterTransform(Bun.stdout)
      )

      await Bun.write(Bun.stdout, "\n")

      const result = await new Response(streamToStdout).text()
      // await new Promise((resolve) => setTimeout(resolve, 500))
      bufferedResults.push({ ...toolResult, result })
    }

    this.messages.push(
      { role: "assistant", content: [{ type: "text", text: textResponse }, ...finishedCalls] },
      { role: "tool", content: bufferedResults },
    )
    
    /**
     * If tools were used, we will attempt a round trip until the max round
     * trips is reached. The loop will break when the model stops using tools or 
     * the max round trips limit is reached.
     */
    if (usedTools && this.roundtrip < this.maxRoundtrips) {
      await this.stream()
    }
  }
}
