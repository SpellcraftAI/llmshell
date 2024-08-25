import { tools } from "@/lib/tools"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage, type ToolResultPart } from "ai"
import { createANSIRenderer, createParser, finish, MarkdownANSIStream, parse } from "mdstream"
import { useCallback, useState } from "react"
import { log, sessionLog } from "@/lib/log"

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

export const useMessages = () => {
  const [messages, setMessages] = useState<CoreMessage[]>([])
  const [formatted, setFormatted] = useState<CoreMessage[]>([])
  const [pending, setPending] = useState<{ role: "assistant", content: string } | null>(null)
  const [usage, setUsage] = useState<CompletionTokenUsage>()

  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)
  
  const send = useCallback(
    async (text?: string) => {
      const messageText = text?.trimEnd()
      if (messageText) {
        let messageFormatted = ""

        const ansiRenderer = createANSIRenderer({
          level: 1,
          render: (chunk) => messageFormatted += chunk
        })

        const ansiParser = createParser(ansiRenderer)
        parse(ansiParser, messageText)
        finish(ansiParser)
       
        const userMessage: CoreMessage = { role: "user", content: messageText }
        const userMessageFormatted: CoreMessage = { role: "user", content: messageFormatted }

        messages.push(userMessage)
        await sessionLog(userMessage)
      
        // Add user message to raw & formatted
        setMessages(messages)
        setFormatted((prev) => [...prev, userMessageFormatted])
      }
      
      // Initialize assistant message
      setPending({ role: "assistant", content: " " })

      await log("STREAM STARTED")
      try {
        const { textStream, usage, toolCalls, toolResults } = await streamText({
          model,
          system: SYSTEM_PROMPT,
          messages,
          tools,
          experimental_toolCallStreaming: true,
          maxTokens: 4096
        })

        const [rawStream, formattedStream] = textStream.tee()
        const markdownStream = 
        formattedStream
          .pipeThrough(new TextEncoderStream())
          .pipeThrough(new MarkdownANSIStream(3))
          .pipeThrough(new TextDecoderStream())
  
        let buffer = ""
        await markdownStream.pipeTo(new WritableStream({
          write(chunk) {
            buffer += chunk
            setPending({ role: "assistant", content: buffer })
          }
        }))

        // update usage
        setUsage(await usage)

        // Add finished assistant message to raw & formatted
        setPending(null)
        setFormatted((prev) => [...prev, { role: "assistant", content: buffer }])

        const rawText = await new Response(rawStream).text()
        // setMessages((prev) => [...prev, { role: "assistant", content: rawText
        // }])

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
              { type: "text", text: rawText },
              ...finishedToolCalls
            ]
          },
          {
            role: "tool",
            content: bufferedResults
          }
        ]

        messages.push(...assistantMessages)
        await sessionLog(...assistantMessages)

        setMessages(messages)

        if (finishedToolCalls.length && roundtrips < MAX_ROUND_TRIPS) {
          await send()
          setUsedTools(true)
          setRoundtrips((prev) => prev + 1)
          await log("ROUNDTRIP", `${roundtrips}`)
        } else {
          setUsedTools(false)
        }
        // if (finishedToolResults.length) {
        //   const toolMessages: CoreMessage[] = finishedToolResults.map((toolResult) => ({
        //     role: "assistant",
        //     content: toolResult
        //   }))
        //   setMessages((prev) => [...prev, ...toolMessages])
        //   // setFormatted((prev) => [...prev, ...toolMessages])
        // }
      } catch (e) {
        await log("STREAM ERROR", JSON.stringify(e))
      }
    },
    [messages, roundtrips]
  )

  return { messages, formatted, pending, usage, usedTools, send }
}