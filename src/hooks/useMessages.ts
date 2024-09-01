import { tools } from "@/lib/tools"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage, type ToolResultPart } from "ai"
import { MarkdownANSIStream } from "mdstream"
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
      // const userMessage: CoreMessage | null = null
      await log("STREAM STARTED")
      try {
        const messageText = text?.trimEnd()
        const userMessage: CoreMessage | null = messageText ? { role: "user", content: messageText } : null

        if (userMessage) {
          await log("SENDING", messageText)
          // userMessage = message

          // setMessages(messages)
          setMessages([...messages, userMessage])
          messages.push(userMessage)
          // setMessages((prev) => [...prev, message])

          await addMessage(userMessage)
          await sessionLog(userMessage)
        }

        // const assistantMessage: CoreMessage = { role: "assistant", content: [{ type: "text", text: "..." }] }
        // setMessages([...messages, assistantMessage])

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
            setTimeout(() => resolve(null), 3000)
          })
        ])

        if (!streamStartedOrAborted) {
          abortController.abort()
          throw new Error("Stream timed out")
        }

        const { textStream, usage, toolCalls, toolResults } = streamStartedOrAborted 
      
        // Initialize assistant message
        // messages.push()
        // setMessages(messages)
        setPending(true)

        // const [rawStream, formattedStream] = textStream.tee()
        // const markdownStream = 
        // formattedStream
        //   .pipeThrough(new TextEncoderStream())
        //   .pipeThrough(new MarkdownANSIStream(3))
        //   .pipeThrough(new TextDecoderStream())
  
        // let formattedBuffer = ""
        // await markdownStream.pipeTo(new WritableStream({
        //   write(chunk) {
        //     // formattedBuffer += chunk
        //     setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: formattedBuffer }])
        //     // setPending({ role: "assistant", content: formattedBuffer })
        //   }
        // }))

        let rawText = ""
        await textStream.pipeTo(
          new WritableStream({
            start() {
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: "" }] }
              // messages[messages.length - 1] = message
              messages.push(message)
              setMessages((prev) => [...prev, message])
            },
            write(chunk) {
              rawText += chunk
              const message: CoreMessage = { role: "assistant", content: [{ type: "text", text: rawText }] }
              messages[messages.length - 1] = message
              setMessages((prev) => [...prev.slice(0, -1), message])
            },
            async close() {
              setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: [{ type: "text", text: rawText }] }])
              await addMessage({ role: "assistant", content: [{ type: "text", text: rawText }] })
            }
          })
        )

        setUsage(await usage)
        setPending(false)

        // const rawText = await new Response(textStream).text()

        // Tool results
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

        // messages.push(...assistantMessages)
        if (finishedToolCalls.length) {
          messages.push(...assistantMessages)
          setMessages(messages)

          await sessionLog(...assistantMessages)
          await addMessage(...assistantMessages)
          // setMessages((prev) => {
          //   prev.at(-1)?.content.push(...finishedToolCalls)
          //   prev.push({
          //     role: "tool",
          //     content: bufferedResults
          //   })
  
          //   return [...prev]
          // })

          // await sessionLog(...assistantMessages)
          // await addMessage(...assistantMessages)
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