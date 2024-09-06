import { tools } from "@/lib/tools"
import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText, type CoreMessage, type LanguageModelUsage } from "ai"
import { useCallback, useState } from "react"
import { writeMessagesToDisk, log, writeMessagesToTranscript } from "@/lib/log"
import { getSystemPrompt } from "@/lib/system"
import { useApp } from "ink"
import { useAppState } from "@/views/state"

export interface UseMessagesOptions {
  initialMessages?: CoreMessage[]
  maxRoundTrips?: number
}

export const useMessages = ({ initialMessages = [], maxRoundTrips = 5 }: UseMessagesOptions) => {
  const { exit } = useApp()
  const { state: { config } } = useAppState()
  const [waiting, setWaiting] = useState(false)
  const [streaming, setStreaming] = useState<boolean>(false)
  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [usage, setUsage] = useState<LanguageModelUsage>()

  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)
  
  const send = useCallback(
    async (text?: string) => {
      if (!config.apiKey) {
        throw new Error("No API key configured. This screen should not have been visible.")
      }

      await log("STREAM STARTED")
      try {
        const messageText = text?.trimEnd()
        const userMessage: CoreMessage | null = messageText ? { role: "user", content: messageText } : null

        if (userMessage) {
          await log("SENDING", messageText)

          messages.unshift(userMessage)
          setMessages([...messages])

          await writeMessagesToDisk(userMessage)
          await writeMessagesToTranscript(userMessage)
        }

        // const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "..." }] }
        // setMessages((prev) => [...prev, message])
        setWaiting(true)

        const abortController = new AbortController()
        const provider = createAnthropic({ apiKey: config.apiKey })
        const stream = streamText({
          model: provider.languageModel("claude-3-5-sonnet-20240620"),
          system: getSystemPrompt(),
          messages: messages.toReversed(),
          tools,
          experimental_toolCallStreaming: true,
          maxTokens: 4096,
          abortSignal: abortController.signal
        })

        const streamStartedOrAborted = await Promise.race([
          stream,
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 10_000)
          })
        ])

        if (!streamStartedOrAborted) {
          abortController.abort()
          throw new Error("Stream timed out")
        }

        const { textStream, usage, toolCalls, toolResults } = streamStartedOrAborted 

        let textBuffer = ""
        await textStream.pipeTo(
          new WritableStream({
            start() {
              setStreaming(true)
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }] }
              messages.unshift(message)
              setMessages((prev) => [message, ...prev])
              setWaiting(false)
            },
            write(chunk) {
              textBuffer += chunk
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
              messages[0] = message
              setMessages((prev) => [message, ...prev.slice(1)])
            },
            async close() {
              setStreaming(false)
              if (!textBuffer.trim()) {
                /**
                 * We received an erroneous empty message from assistant. Don't
                 * add it to disk, remove from memory.
                 */
                messages.shift()
                setMessages([...messages])
                return
              }

              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
              await writeMessagesToDisk(message)
              await writeMessagesToTranscript(message)
            }
          })
        )
        
        setUsage(await usage)
                
        // If no tool calls - we're done.
        const [finishedToolCalls, finishedToolResults] = await Promise.all([toolCalls, toolResults])
        if (!finishedToolCalls.length && !finishedToolResults.length) {
          setUsedTools(false)
          setRoundtrips(0)
          return
        }

        // Add tool calls to messages context.
        const toolCallsMessage: CoreMessage = { role: "assistant", content: finishedToolCalls }
        messages.unshift(toolCallsMessage)
        setMessages([...messages])
        await writeMessagesToDisk(toolCallsMessage)

        // const bufferedResults: ToolResultPart[] = []
        for (const toolResult of finishedToolResults) {
          if (!toolResult.result) continue

          let textBuffer = ""
          await toolResult.result.pipeThrough(new TextDecoderStream()).pipeTo(
            new WritableStream({
              start() {
                const message: CoreMessage = { role: "tool", content: [] }
                setStreaming(true)
                messages.unshift(message)
                setMessages([...messages])
              },
              write(chunk) {
                textBuffer += chunk
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
                messages[0] = message
                setMessages([...messages])
              },
              async close() {
                setStreaming(false)
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer.trim() }] }
                messages[0] = message
                setMessages([...messages])
                await writeMessagesToDisk(message)
                await writeMessagesToTranscript(message)
              }
            })
          )
        }

        if (roundtrips < maxRoundTrips - 1) {
          setUsedTools(true)
          setRoundtrips((prev) => prev + 1)
          await log("ROUNDTRIP", `${roundtrips}`)
          await send()
        } else {
          setUsedTools(false)
          setRoundtrips(0)
        }
      } catch (error: unknown) {
        await log("STREAM ERROR", { error })
        await log({ messages })
        exit(error as Error)
        // throw error
      }
    },
    [config.apiKey, exit, maxRoundTrips, messages, roundtrips]
  )

  return { messages, waiting, streaming, usage, usedTools, roundtrips, send }
}