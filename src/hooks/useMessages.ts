import { tools } from "@/lib/tools"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage, type ToolResultPart } from "ai"
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
  const [pending, setPending] = useState(false)
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

          setMessages([...messages, userMessage])
          messages.push(userMessage)

          await addMessage(userMessage)
          await sessionLog(userMessage)
        }

        const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "..." }] }
        setPending(true)
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

        let rawText = ""
        await textStream.pipeTo(
          new WritableStream({
            start() {
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }] }
              messages.push(message)
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            write(chunk) {
              rawText += chunk
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: rawText }] }
              messages[messages.length - 1] = message
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            async close() {
              await addMessage({ role: "assistant", content: [{ type: "text", text: rawText }] })
            }
          })
        )

        setUsage(await usage)
        setPending(false)

        // Finished tool results
        const [finishedToolCalls, finishedToolResults] = await Promise.all([toolCalls, toolResults])

        const bufferedResults: ToolResultPart[] = []
        for (const toolResult of finishedToolResults) {
          if (!toolResult.result) continue
          const text = await new Response(toolResult.result).text()
          bufferedResults.push({ ...toolResult, result: text })
        }

        const assistantMessages: CoreMessage[] = [
          { 
            role: "assistant", 
            content: [ 
              ...finishedToolCalls
            ]
          },
          {
            role: "tool",
            content: bufferedResults
          }
        ]

        if (finishedToolCalls.length) {
          messages.push(...assistantMessages)
          setMessages(messages)

          await sessionLog(...assistantMessages)
          await addMessage(...assistantMessages)
        }

        if (finishedToolCalls.length && roundtrips < MAX_ROUND_TRIPS) {
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