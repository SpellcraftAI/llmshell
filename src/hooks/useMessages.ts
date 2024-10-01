import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText, type CoreMessage, type CoreTool, type LanguageModel, type LanguageModelUsage, type StreamTextResult } from "ai"
import { useCallback, useEffect, useState } from "react"
import { writeMessagesToDisk, log, writeMessagesToTranscript } from "@/lib/log"
import { SYSTEM_PROMPT } from "@/lib/system"
import { useApp } from "ink"
import { useAppState } from "@/lib/state"
import { tools } from "@/lib/tools"
import { getCost, type TokensCost } from "@/lib/cost"
import { createOpenAI } from "@ai-sdk/openai"

export interface UseMessagesOptions {
  initialMessages?: CoreMessage[]
  maxRoundTrips?: number
}

const EMPTY_COST: TokensCost = {
  input: 0,
  output: 0,
  total: 0
}

const EMPTY_USAGE: LanguageModelUsage = {
  completionTokens: 0,
  promptTokens: 0,
  totalTokens: 0
}

export const useMessages = ({ 
  initialMessages = [], 
  maxRoundTrips = 5
}: UseMessagesOptions) => {
  const { exit } = useApp()
  const { state: { config, customTools, needsApiKey } } = useAppState()

  const [waiting, setWaiting] = useState(false)
  const [streaming, setStreaming] = useState<boolean>(false)

  const [lastUsage, setLastUsage] = useState<LanguageModelUsage>(EMPTY_USAGE)
  const [totalUsage, setTotalUsage] = useState<LanguageModelUsage>(EMPTY_USAGE)

  const [lastCost, setLastCost] = useState(EMPTY_COST)
  const [totalCost, setTotalCost] = useState(EMPTY_COST)

  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  // const [assistantMessage, setAssistantMessage] = useState<CoreMessage | null>(null)
  
  const [stream, setStream] = useState<StreamTextResult<typeof tools & Record<string, CoreTool>> | null>(null)
  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)

  useEffect(() => {
    if (needsApiKey) {
      throw new Error("Missing necessary API key. Should not make it to this page.")
    }
  }, [needsApiKey])

  let model: LanguageModel
  switch (config.model) {
  case "GPT-4o":
    const openai = createOpenAI({ apiKey: config.openaiApiKey })
    model = openai.languageModel("gpt-4o")
    break

  case "Claude Sonnet 3.5":
    const anthropic = createAnthropic({ apiKey: config.anthropicApiKey }) 
    model = anthropic.languageModel("claude-3-5-sonnet-20240620")
    break
      
  default:
    throw new Error(`Unknown model: ${config.model}`)
  }

  /**
   * Create a stream given the current context and tools.
   */
  const getStream = useCallback(
    async (text?: string) => {
      try { 
        const messageText = text?.trimEnd()
        const userMessage: CoreMessage | null = messageText ? { role: "user", content: messageText } : null
  
        const unreversed = messages.toReversed()
        if (userMessage) {
          unreversed.push(userMessage)
  
          setMessages((prev) => [userMessage, ...prev]) 
          await writeMessagesToDisk(userMessage)
          await writeMessagesToTranscript(userMessage)
        }
  
        setWaiting(true)
        setUsedTools(false)
  
        const abortController = new AbortController()
        
        await log("STREAM STARTED")
  
        const stream = streamText({
          model,
          // model: provider.languageModel("gpt-4o"),
          system: SYSTEM_PROMPT,
          messages: unreversed,
          tools: {
            ...tools,
            ...customTools,
          },
          experimental_toolCallStreaming: true,
          experimental_providerMetadata: {
            assistant: {
              model: config.model
            }
          },
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
    [messages, model, customTools, config.model, exit]
  )
  
  /**
   * Send a new user message.
   */
  const send = useCallback(
    async (text?: string) => {
      const stream = await getStream(text)
      setStream(stream)
    },
    [getStream]
  )

  const DEBOUNCE_TIME = 100

  /**
   * Read the stream and update the messages context.
   */
  const readStream = useCallback(
    async () => {
      if (!stream) return
      const { textStream, usage, toolCalls, toolResults } = stream 

      const experimental_providerMetadata = { assistant: { model: config.model } }

      let textBuffer = ""
      let lastTime = Date.now()
      await textStream.pipeTo(
        new WritableStream({
          start() {
            setStreaming(true)
            const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }], experimental_providerMetadata }
            setMessages((prev) => [message, ...prev])
            // setAssistantMessage(message)
            setWaiting(false)
          },
          write(chunk) {
            textBuffer += chunk
            // If > DEBOUNCE_TIME, we can flush the buffer.
            const now = Date.now()
            if (now - lastTime >= DEBOUNCE_TIME) {
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }], experimental_providerMetadata }
              setMessages((prev) => [message, ...prev.slice(1)])
              lastTime = now
            }
            // setAssistantMessage(message)
          },
          async close() {
            setStreaming(false)
            if (!textBuffer.trim()) {
              /**
               * We received an erroneous empty message from assistant. Don't
               * add it to disk, remove from memory.
               */
              // setAssistantMessage(null)
              setMessages((prev) => prev.slice(1))
              return
            }

            const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }], experimental_providerMetadata }
            // setAssistantMessage(() => null)
            setMessages((prev) => [message, ...prev.slice(1)])
            await writeMessagesToDisk(message)
            await writeMessagesToTranscript(message)
          }
        })
      )

      /**
       * Anthropic will buffer the stream and send the chunks all at once.
       * OpenAI may behave differently.
       */
      // await fullStream.pipeTo(
      //   new WritableStream({
      //     start() {
      //       log("FULL STREAM START")
      //     },
      //     write(chunk) {
      //       switch (chunk.type) {
      //       case "tool-call-delta":
      //         log("TOOL CALL DELTA", chunk)
      //         break
      //       }
      //     }, 
      //     close() {
      //       log("FULL STREAM END")
      //     } 
      //   })
      // )
        
      const currentUsage = await usage
      setLastUsage(currentUsage)
                
      // If no tool calls - we're done.
      const [finishedToolCalls, finishedToolResults] = await Promise.all([toolCalls, toolResults])
      if (!finishedToolCalls.length && !finishedToolResults.length) {
        setUsedTools(false)
        setRoundtrips(0)
        return
      }

      // Add tool calls to messages context.
      const toolCallsMessage: CoreMessage = { role: "assistant", content: finishedToolCalls, experimental_providerMetadata }
      setMessages((prev) => [toolCallsMessage, ...prev])
      await writeMessagesToDisk(toolCallsMessage)

      for (const toolResult of finishedToolResults) {
        if (!toolResult.result) continue

        if (!(toolResult.result instanceof ReadableStream)) {
          const message: CoreMessage = { role: "tool", content: [toolResult], experimental_providerMetadata }
          setMessages((prev) => [message, ...prev])
          await writeMessagesToDisk(message)
          await writeMessagesToTranscript(message)
          continue
        }

        let textBuffer = ""
        let lastTimestamp = Date.now()
        await toolResult.result.pipeThrough(new TextDecoderStream()).pipeTo(
          new WritableStream({
            start() {
              const message: CoreMessage = { role: "tool", content: [], experimental_providerMetadata }
              setStreaming(true)
              setMessages((prev) => [message, ...prev])
            },
            write(chunk) {
              textBuffer += chunk

              if (Date.now() - lastTimestamp > 100) {
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
                setMessages((prev) => [message, ...prev.slice(1)])
                lastTimestamp = Date.now()
              }
            },
            async close() {
              setStreaming(false)
              const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer.trim() }], experimental_providerMetadata }
              setMessages((prev) => [message, ...prev.slice(1)])
              await writeMessagesToDisk(message)
              await writeMessagesToTranscript(message)
            }
          })
        )
      }

      setUsedTools(true)
    },
    [config.model, stream]
  )

  /**
   * Update costs when lastUsage changes.
   */
  useEffect(
    () => {
      setTotalUsage((prev) => ({ 
        promptTokens: prev.promptTokens + lastUsage.promptTokens,
        completionTokens: prev.completionTokens + lastUsage.completionTokens,
        totalTokens: prev.totalTokens + lastUsage.totalTokens,
      }))
      
      const currentCost = getCost(lastUsage)
      setLastCost(currentCost)
      setTotalCost((prev) => ({
        input: prev.input + currentCost.input,
        output: prev.output + currentCost.output,
        total: prev.total + currentCost.total
      }))
    },
    [lastUsage]
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
      if (!usedTools) {
        return
      }
      
      if (roundtrips < maxRoundTrips) {
        // Make trip.
        setRoundtrips((prev) => prev + 1)
        send()
      } else {
        setRoundtrips(0)
      }
    },
    [maxRoundTrips, roundtrips, send, usedTools]
  )

  return { messages, waiting, streaming, lastUsage, totalUsage, lastCost, totalCost, usedTools, roundtrips, send }
}