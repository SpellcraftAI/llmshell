import { Box, Newline, Text } from "ink"
import { useEffect, useLayoutEffect } from "react"
import { clearTerminal } from "ansi-escapes"

import { TextInput } from "@/components/TextInput"
import { MessageBubble } from "@/components/MessageBubble"
import { useTerminalSize } from "@/hooks/useTerminalWidth"
import { useMessages } from "@/hooks/useMessages"
import { useServer } from "@/hooks/useServer"
import { compactNumber } from "@/lib/number"
import { log, SESSION_ID, type Conversation } from "@/lib/log"
import type { CoreMessage } from "ai"
import { createANSIRenderer, createParser, finish, parse } from "mdstream"
import { useClearScreen } from "@/hooks/useClearScreen"

export const parseSync = (text: string) => {
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

const CoreMessageBubble = ({ message }: { message: CoreMessage }) => {
  const from = message.role === "assistant" ? "Claude" : "you"

  if (Array.isArray(message.content)) {
    return message.content.map(
      (message, index) => {
        switch (message.type) {
        case "text":
          return <MessageBubble key={index} from={from} text={parseSync(message.text)} />

        case "tool-call":
          // const argsTable = stringConsole.table(message.args)
          return (
            <Box key={index} flexDirection="column" paddingLeft={1} alignItems="flex-start">
              {/* <Text bold>Tool</Text> */}
              <Box borderStyle="round" borderDimColor flexShrink={1}>
                <Text bold>{message.toolName}</Text>
              </Box>
              {Object.entries(message.args as object).map(([key, value]) => (
                <Box key={key} flexDirection="row" paddingLeft={1} gap={1} justifyContent="space-around">
                  <Text bold>{key}</Text>
                  <Text dimColor>{value}</Text>
                </Box>
              ))}
            </Box>
          )
        }
      }
    )
  }

  return (
    <MessageBubble from={from} text={parseSync(message.content)} />
  )
}

export interface ChatProps {
  conversation?: Conversation
}

export const Chat = ({ conversation }: ChatProps) => {
  const server = useServer()
  const [width] = useTerminalSize({ maxWidth: 100 })
  const { messages, pending, usage, send } = useMessages(conversation?.messages)

  // Clear terminal on first render.
  useClearScreen()

  // Stop server on exit.
  useLayoutEffect(() => {
    process.on("exit", () => server?.stop())
  }, [server])

  if (!server) {
    return null
  }

  // const pendingMessage: CoreMessage | null = 
  //   pending
  //     ? { role: "assistant", content: pending.content }
  //     : null

  return (
    <Box 
      flexDirection="column" 
      justifyContent="center"
      alignSelf="center" 
      paddingTop={1}
      width={width - 4}
      // borderStyle="round"
      // borderColor="red"
    >
      <Box 
        flexDirection="column" 
        alignSelf="center"
        rowGap={1}
        paddingX={4}
        width={width - 4}
      >
        {messages.map((message, index) => (
          message && <CoreMessageBubble key={index} message={message} />
        ))}
        {/* {pending && <MessageBubble from="Claude" text={pending.content} />} */}
      </Box>

      <Box flexDirection="row" alignItems="flex-start" gap={1}>
        <Box 
          flexDirection="column" 
          alignItems="center" 
          alignSelf="flex-start"
          justifyContent="center" 
          borderStyle="round" 
          borderDimColor
          borderColor={pending ? "yellow" : undefined}
          marginTop={1}
          paddingX={1}
          flexShrink={0}
          gap={1}
        >
          <Box flexDirection="column" justifyContent="center" alignItems="center">
            <Text dimColor>Tokens</Text>
            <Text dimColor>{compactNumber(usage?.totalTokens ?? 0)}</Text>
          </Box>

          <Box flexDirection="column" justifyContent="center" alignItems="center">
            <Text dimColor>Session ID</Text>
            <Text dimColor>{SESSION_ID}</Text>
          </Box>
        </Box>
          
        <TextInput onSubmit={send} />
      </Box>
    </Box>
  )
}