import "../shim"
import chalk from "chalk"
import { streamText, type CoreMessage } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import readline, { createInterface, Interface } from "readline"
import ora, { type Ora } from "ora"
import boxen from "boxen"
import { tools } from "./tools"

import { startServer } from "./fs"
import { IndentWrapTransform } from "./IndentWrapper"
import { OBJ, parse, STR } from "partial-json"
import { StreamingToolArgs } from "./StreamingToolArgs"

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

    const toolArgsStream = new StreamingToolArgs()
    const toolArgsReader = toolArgsStream.readable.getReader()
    const toolArgsWriter = toolArgsStream.writable.getWriter()

    async function handleToolArgsOutput() {
      while (true) {
        const { done, value: result } = await toolArgsReader.read()
        if (done) break
        if (!result) break
    
        const { key, value } = result
    
        if (key !== currentKey) {
          currentKey = key
          process.stdout.write("\n")
          process.stdout.write(
            boxen(
              chalk.dim(chalk.yellow(key)),
              { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
            )
          )
          process.stdout.write("\n")
        }
    
        process.stdout.write(value)
      }
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
          // stdoutIndent.write("");
          // process.stdout.write("\nTOOL CALL");
          break
  
        case "finish":
          stdoutIndent._flush()
          // console.log("\nFINISH");
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
          process.stdout.write("\n")
  
          break
  
        case "tool-call-delta":
          await toolArgsWriter.write(ENCODER.encode(chunk.argsTextDelta))
          // const prevBuffer = toolBuffers.get(chunk.toolName) || ""
          // const newBuffer = prevBuffer + chunk.argsTextDelta
          // toolBuffers.set(chunk.toolName, newBuffer)
  
          // if (newBuffer) {
          //   const prevPartial = prevBuffer ? parse(prevBuffer, STR | OBJ) : {}
          //   const partial = parse(newBuffer, STR | OBJ)
  
          //   const keys = new Set<string>(Object.keys(partial))
          //   if (keys.size > 0) {
          //     const newKeys = new Set([...keys].filter((key) => !toolBufferProperties.get(chunk.toolName)?.has(key)))
          //     toolBufferProperties.set(chunk.toolName, keys)
  
          //     // Will only ever be one when streaming.
          //     const newKey = newKeys.values().next().value
          //     if (newKey) {
          //       currentKey = newKey
          //       process.stdout.write("\n")
          //       process.stdout.write(
          //         boxen(
          //           chalk.dim(chalk.yellow(newKey)), 
          //           { title: "Arg", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
          //         )
          //       )
          //       process.stdout.write("\n")
          //     }
          //   }
  
          //   if (currentKey) {
          //     const prevValue = prevPartial?.[currentKey]
          //     const newValue = partial?.[currentKey]
          //     if (prevValue && !newValue.startsWith(prevValue)) {
          //       throw new Error("Error streaming JSON properties.")
          //     }
  
          //     const chunk = prevValue ? newValue.slice(prevValue.length) : newValue
  
          //     process.stdout.write(
          //       chalk.dim(
          //         chalk.yellow(chunk)
          //       )
          //     )
          //   }
          // }
          break
        }
      }

      await toolArgsWriter.close()
    }

    await Promise.all([handleStream(), handleToolArgsOutput()])

    process.stdout.write("\n")

    const finishedCalls = await toolCalls
    const finishedResults = await toolResults

    if (finishedCalls.length > 0) {
      messages.push({ role: "assistant", content: finishedCalls })
      messages.push({ role: "tool", content: finishedResults })
    }

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
      process.stdout.write("\n")

      switch (toolResult.toolName) {
      case "terminal":
        if (toolResult.result instanceof ReadableStream) {
          const reader = toolResult.result.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = DECODER.decode(value)
            Bun.write(Bun.stdout, value)
            content += text
          }
        }
        break

      case "read":
      case "write":
      case "edit":
        if (typeof toolResult.result === "object" && "data" in toolResult.result) {
          content = toolResult.result.data as string
          process.stdout.write(chalk.dim(chalk.yellow(content)))
          process.stdout.write("\n")
        }
        break
      }
    }

    messages.push({ role: "assistant", content: textResponse })
  }

  process.on("exit", () => {
    server.stop()
  })

  while (true) {
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

      const oneTime = (data: Uint8Array) => {
        // Check if the first byte is within ASCII printable character range
        const isASCII = data[0] >= 32 && data[0] <= 126
        const isPaste = data.length > 3

        const isEnter = data[0] === 13
        if (isEnter) {
          console.log("first enter")
          return
        }

        if (!isASCII && !isPaste) {
          return
        }

        // Remove the listener after the first keypress.
        process.stdin.removeListener("data", oneTime)

        // Move down to the instructions line.
        process.stdout.moveCursor(0, 2)
        // Clear it.
        process.stdout.clearLine(0)
        // Return to the input line.
        process.stdout.moveCursor(0, -2)
        // Add the indent.
        process.stdout.cursorTo(2)

        Bun.write(Bun.stdin, data)
      }

      process.stdin.on("data", oneTime)
      Bun.write(Bun.stdout, chalk.dim("\n\n\n  Begin typing. Press Enter to send, Ctrl+C to exit."))
      process.stdout.moveCursor(0, -2)
      process.stdout.cursorTo(2)
    })
  }
}