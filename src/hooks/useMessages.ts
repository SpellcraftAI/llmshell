import { tools } from "@/lib/tools"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText, type CompletionTokenUsage, type CoreMessage, type ToolResultPart } from "ai"
import { createANSIRenderer, createParser, finish, MarkdownANSIStream, parse } from "mdstream"
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

const parseSync = (text: string) => {
  let parsed = ""

  const ansiRenderer = createANSIRenderer({
    level: 1,
    render: (chunk) => parsed += chunk
  })

  const ansiParser = createParser(ansiRenderer)
  parse(ansiParser, text)
  finish(ansiParser)
  return parsed
}

const parseMessages = (messages: CoreMessage[]): CoreMessage[] => {
  return messages.map((message) => {
    if (message.role !== "assistant" && message.role !== "user") {
      return message
    }

    if (typeof message.content === "string") {
      return { ...message, content: parseSync(message.content) }
    } else if (Array.isArray(message.content)) {
      const formattedContentArray = message.content.map((content) => {
        if (content.type === "text") {
          return ({ ...content, text: parseSync(content.text) })
        }

        return content
      })

      return { ...message, content: formattedContentArray }
    }

    return message
  }) as CoreMessage[]
}

export const useMessages = (initialMessages: CoreMessage[] = []) => {
  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [formatted, setFormatted] = useState<CoreMessage[]>(parseMessages(initialMessages))
  const [pending, setPending] = useState<{ role: "assistant", content: string } | null>(null)
  const [usage, setUsage] = useState<CompletionTokenUsage>()

  const [usedTools, setUsedTools] = useState(false)
  const [roundtrips, setRoundtrips] = useState(0)
  
  const send = useCallback(
    async (text?: string) => {
      const messageText = text?.trimEnd()
      if (messageText) {
       
        const userMessage: CoreMessage = { role: "user", content: messageText }
        const userMessageFormatted: CoreMessage = { role: "user", content: parseSync(messageText) }

        messages.push(userMessage)
        await addMessage(userMessage)
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
              { type: "text", text: rawText.trim() },
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
        await addMessage(...assistantMessages)

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