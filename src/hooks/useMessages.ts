import { tools } from "@/lib/tools"
import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage } from "ai"
import { useCallback, useState } from "react"
import { addMessage, log, sessionLog } from "@/lib/log"
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
  const [usage, setUsage] = useState<CompletionTokenUsage>()

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

          messages.push(userMessage)
          setMessages([...messages])

          await addMessage(userMessage)
          await sessionLog(userMessage)
        }

        // const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "..." }] }
        // setMessages((prev) => [...prev, message])
        setWaiting(true)

        const abortController = new AbortController()
        const provider = createAnthropic({ apiKey: config.apiKey })
        const stream = streamText({
          model: provider.languageModel("claude-3-5-sonnet-20240620"),
          system: getSystemPrompt(),
          messages: messages,
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
              messages.push(message)
              setMessages((prev) => [...prev, message])
              setWaiting(false)
            },
            write(chunk) {
              textBuffer += chunk
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
              messages[messages.length - 1] = message
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            async close() {
              setStreaming(false)
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
              await addMessage(message)
              await sessionLog(message)
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
        messages.push(toolCallsMessage)
        setMessages([...messages])
        await addMessage(toolCallsMessage)

        // const bufferedResults: ToolResultPart[] = []
        for (const toolResult of finishedToolResults) {
          if (!toolResult.result) continue

          let textBuffer = ""
          await toolResult.result.pipeThrough(new TextDecoderStream()).pipeTo(
            new WritableStream({
              start() {
                const message: CoreMessage = { role: "tool", content: [] }
                setStreaming(true)
                messages.push(message)
                setMessages([...messages])
              },
              write(chunk) {
                textBuffer += chunk
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
                messages[messages.length - 1] = message
                setMessages([...messages])
              },
              async close() {
                setStreaming(false)
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
                messages[messages.length - 1] = message
                setMessages([...messages])
                await addMessage(message)
                await sessionLog(message)
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