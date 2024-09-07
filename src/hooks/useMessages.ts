import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText, type CoreMessage, type CoreTool, type LanguageModelUsage, type StreamTextResult } from "ai"
import { useCallback, useEffect, useState } from "react"
import { writeMessagesToDisk, log, writeMessagesToTranscript } from "@/lib/log"
import { getSystemPrompt } from "@/lib/system"
import { useApp } from "ink"
import { useAppState } from "@/views/state"
import { tools } from "@/lib/tools"

export interface UseMessagesOptions {
  initialMessages?: CoreMessage[]
  maxRoundTrips?: number
}

export const useMessages = ({ 
  initialMessages = [], 
  maxRoundTrips = 5
}: UseMessagesOptions) => {
  const { exit } = useApp()
  const { state: { config, customTools } } = useAppState()

  const [waiting, setWaiting] = useState(false)
  const [streaming, setStreaming] = useState<boolean>(false)
  const [usage, setUsage] = useState<LanguageModelUsage>()

  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [assistantMessage, setAssistantMessage] = useState<CoreMessage | null>(null)
  
  const [stream, setStream] = useState<StreamTextResult<typeof tools & Record<string, CoreTool>> | null>(null)
  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)

  /**
   * Create a stream given the current context and tools.
   */
  const getStream = useCallback(
    async (text?: string) => {
      try { 
        if (!config.apiKey) {
          throw new Error("No API key configured. Cannot connect to Anthropic.")
        }
  
        const messageText = text?.trimEnd()
        const userMessage: CoreMessage | null = messageText ? { role: "user", content: messageText } : null
  
        const reversed = messages.toReversed()
        if (userMessage) {
          reversed.push(userMessage)
  
          setMessages((prev) => [userMessage, ...prev]) 
          await writeMessagesToDisk(userMessage)
          await writeMessagesToTranscript(userMessage)
        }
  
        setWaiting(true)
        setUsedTools(false)
  
        const abortController = new AbortController()
        const provider = createAnthropic({ apiKey: config.apiKey })
        
        await log("STREAM STARTED")
  
        const stream = streamText({
          model: provider.languageModel("claude-3-5-sonnet-20240620"),
          system: getSystemPrompt(),
          messages: reversed,
          tools: {
            ...tools,
            ...customTools,
          },
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
  
        return streamStartedOrAborted
      } catch (error: unknown) {
        await log("STREAM ERROR", { error })
        // await log({ messages })
        exit(error as Error)
        throw error
      }
    },
    [config.apiKey, exit, messages, customTools]
  )
  
  /**
   * Send a new user message.
   */
  const send = useCallback(
    async (text?: string) => {
      if (!config.apiKey) {
        throw new Error("No API key configured. This screen should not have been visible.")
      }

      const stream = await getStream(text)
      setStream(stream)
    },
    [config.apiKey, getStream]
  )

  /**
   * Read the stream and update the messages context.
   */
  const readStream = useCallback(
    async () => {
      if (!stream) return
      const { textStream, usage, toolCalls, toolResults } = stream 

      let textBuffer = ""
      await textStream.pipeTo(
        new WritableStream({
          start() {
            setStreaming(true)
            const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }] }
            setAssistantMessage(message)
            setWaiting(false)
          },
          write(chunk) {
            textBuffer += chunk
            const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
            setAssistantMessage(message)
          },
          async close() {
            setStreaming(false)
            if (!textBuffer.trim()) {
              /**
               * We received an erroneous empty message from assistant. Don't
               * add it to disk, remove from memory.
               */
              setAssistantMessage(null)
              return
            }

            const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
            setAssistantMessage(null)
            setMessages((prev) => [message, ...prev])
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
      setMessages((prev) => [toolCallsMessage, ...prev])
      await writeMessagesToDisk(toolCallsMessage)

      for (const toolResult of finishedToolResults) {
        if (!toolResult.result) continue

        if (!(toolResult.result instanceof ReadableStream)) {
          const message: CoreMessage = { role: "tool", content: [toolResult] }
          setMessages((prev) => [message, ...prev])
          await writeMessagesToDisk(message)
          await writeMessagesToTranscript(message)
          continue
        }

        let textBuffer = ""
        await toolResult.result.pipeThrough(new TextDecoderStream()).pipeTo(
          new WritableStream({
            start() {
              const message: CoreMessage = { role: "tool", content: [] }
              setStreaming(true)
              setMessages((prev) => [message, ...prev])
            },
            write(chunk) {
              textBuffer += chunk
              const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
              setMessages((prev) => [message, ...prev.slice(1)])
            },
            async close() {
              setStreaming(false)
              const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer.trim() }] }
              setMessages((prev) => [message, ...prev.slice(1)])
              await writeMessagesToDisk(message)
              await writeMessagesToTranscript(message)
            }
          })
        )
      }

      setUsedTools(true)
    },
    [stream]
  )

  /**
   * When a stream is available, read it and then reset the stream.
   */
  useEffect(
    () => {
      if (stream) {
        readStream().then(() => setStream(null))
      }
    },
    [readStream, stream]
  )

  /** 
   * Do roundtrips as needed.
   */
  useEffect(
    () => {
      if (usedTools && roundtrips < maxRoundTrips) {        
        // Make trip.
        setRoundtrips((prev) => prev + 1)
        send()
      }
    },
    [maxRoundTrips, roundtrips, send, usedTools]
  )

  return { assistantMessage, messages, waiting, streaming, usage, usedTools, roundtrips, send }
}