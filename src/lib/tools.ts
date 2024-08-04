import { FileWriterStream } from "@/internals/FileWriteStream"
import { getShellCommand } from "@/internals/getShellCommand"
import { JSONPropertyStream, type JSONPropertyChunk } from "@/internals/JSONPropertyStream"
import { streamText, tool, type CoreMessage, type LanguageModel } from "ai"
import { z } from "zod"


/**
 * execute() must not return streams, since Bun does not support half duplex
 * (streams up, streams down).
 */
export const tools = {
  read: tool({
    description: "Read the contents of a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to read")
    }),
    execute: async ({ path }) => {
      const response = await fetch("http://localhost:3000/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      })
      return response.body
      // return await response.text()
    }
  }),

  write: tool({
    description: "Write content to a file, overwriting if it exists.",
    parameters: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file")
    }),
    execute: async ({ path, content }) => {
      const response = await fetch("http://localhost:3000/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content })
      })
      return response.body
      // return await response.text()
    }
  }),

  edit: tool({
    description: "Edit specific lines in a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to edit"),
      startLine: z.number().describe("The starting line number for the edit"),
      endLine: z.number().describe("The ending line number for the edit"),
      content: z.string().describe("The new content to replace the specified lines"),
    }),
    execute: async ({ path, content, startLine, endLine }) => {
      const response = await fetch("http://localhost:3000/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, startLine, endLine, content })
      })
      return response.body
      // return await response.text()
    }
  }),

  terminal: tool({
    description: `Type directly into the terminal's stdin. The text you type is parsed as JSON and can contain ANSI escape codes. Shell: ${getShellCommand()}`,
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      const response = await fetch("http://localhost:3000/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      })

      return response.body
      // return await response.text()
    }
  })
}

export const callTools = async (
  model: LanguageModel,
  messages: CoreMessage[],
  // argStream: ReadableStream<ToolArgChunk<z.infer<typeof tools[keyof typeof tools]["parameters"]>>>
) => {
  const ENCODER = new TextEncoder()
  const { fullStream, textStream, toolCalls, toolResults } = await streamText({
    model,
    messages,
    tools,
    experimental_toolCallStreaming: true,
    maxTokens: 4096
  })

  const [toolCallStream, toolCallArgStream] = fullStream.tee()

  /**
   * Display initial text response.
   */
  await textStream.pipeTo(new FileWriterStream(Bun.stdout))

  const [finishedCalls, finishedResults] = await Promise.all([toolCalls, toolResults])
  console.log({ finishedCalls, finishedResults })

  return

  /**
   * Transform to display tool calls.
   */

  // const toolCalls = toolCallStream.pipeThrough(
  //   new TransformStream({
  //     async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
  //       switch (chunk.type) {
  //       case "tool-call-streaming-start":
  //         const { toolName } = chunk

  //         const toolCallArgs = 
  //           toolCallArgStream.pipeThrough(
  //             new TransformStream({
  //               async transform(chunk, controller: TransformStreamDefaultController<Uint8Array>) {
  //                 switch(chunk.type) {
  //                 case "tool-call-delta":
  //                   controller.enqueue(ENCODER.encode(chunk.argsTextDelta))
  //                   break
  //                 }
  //               }
  //             })
  //           )

  //         console.log({ toolName, toolCallArgs })

  //         const response = await fetch("http://localhost:3000/" + toolName, {
  //           method: "POST",
  //           body: toolCallArgs,
  //         })

  //       //   if (!response.ok || !response.body) {
  //       //     console.error({ response })
  //       //     throw new Error("Failed to call tool.")
  //       //   }

  //       //   const reader = response.body.getReader()
  //       //   try {
  //       //     while (true) {
  //       //       const { done, value } = await reader.read()
  //       //       if (done) {
  //       //         break
  //       //       }
  //       //       controller.enqueue(value)
  //       //     }
  //       //   } finally {
  //       //     reader.releaseLock()
  //       //   }
  //       }
  //     }
  //   })
  // )

  return toolCalls

}