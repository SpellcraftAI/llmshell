import { tools } from "@/lib/tools"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage } from "ai"
import { useCallback, useState } from "react"
import { addMessage, log, sessionLog } from "@/lib/log"

const SYSTEM_PROMPT = `
You interface with the user's computer system. 
Use Markdown formatting for your text responses.
You don't need to use tools to write Markdown.

USER: ...

ASSISTANT:

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

**Bold Text**
*Italic Text*

\`\`\`
code block
\`\`\`

To write ticks without parsing a code block, use a backslash: \\\`
Escaped triple: \\\`\\\`\\\`
...
`.trim()

const model = anthropic("claude-3-5-sonnet-20240620")

const MAX_ROUND_TRIPS = 5

export const useMessages = (initialMessages: CoreMessage[] = []) => {
  const [pending, setPending] = useState<boolean>(false)
  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [usage, setUsage] = useState<CompletionTokenUsage>()

  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)
  
  const send = useCallback(
    async (text?: string) => {
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

        const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "..." }] }
        setMessages((prev) => [...prev, message])

        const abortController = new AbortController()
        const stream = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: messages,
          tools,
          experimental_toolCallStreaming: true,
          maxTokens: 4096,
          abortSignal: abortController.signal
        })

        const streamStartedOrAborted = await Promise.race([
          stream,
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 5_000)
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
              setPending(true)
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }] }
              messages.push(message)
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            write(chunk) {
              textBuffer += chunk
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: textBuffer }] }
              messages[messages.length - 1] = message
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            async close() {
              setPending(false)
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
          return
        }

        // Add tool calls to messages context.
        const toolCallsMessage: CoreMessage = { role: "assistant", content: finishedToolCalls }
        messages.push(toolCallsMessage)
        setMessages([...messages])

        // const bufferedResults: ToolResultPart[] = []
        for (const toolResult of finishedToolResults) {
          if (!toolResult.result) continue

          let textBuffer = ""
          await toolResult.result.pipeThrough(new TextDecoderStream()).pipeTo(
            new WritableStream({
              start() {
                const message: CoreMessage = { role: "tool", content: [] }
                setPending(true)
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
                setPending(false)
                const message: CoreMessage = { role: "tool", content: [{...toolResult, result: textBuffer }] }
                messages[messages.length - 1] = message
                setMessages([...messages])
                await addMessage(message)
                await sessionLog(message)
              }
            })
          )
        }

        if (roundtrips < MAX_ROUND_TRIPS) {
          await send()
          setUsedTools(true)
          setRoundtrips((prev) => prev + 1)
          await log("ROUNDTRIP", `${roundtrips}`)
        } else {
          setUsedTools(false)
        }
      } catch (error) {
        await log("STREAM ERROR", { error })
        await log({ messages })
        throw error
      }
    },
    [messages, roundtrips]
  )

  return { messages, pending, usage, usedTools, send }
}