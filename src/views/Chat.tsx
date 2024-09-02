import { Box, Text, useFocusManager } from "ink"
import { useEffect, useLayoutEffect } from "react"

import { TextInput } from "@/components/TextInput"
import { useTerminalSize } from "@/hooks/useTerminalWidth"
import { useMessages } from "@/hooks/useMessages"
import { useServer } from "@/hooks/useServer"
import { compactNumber } from "@/lib/number"
import { SESSION_ID, type Conversation } from "@/lib/log"
import { useClearScreen } from "@/hooks/useClearScreen"
import { CoreMessageBubble } from "@/components/MessageBubble/CoreMessage"

export interface ChatProps {
  conversation?: Conversation
}

export const Chat = ({ conversation }: ChatProps) => {
  const server = useServer()
  const [width] = useTerminalSize({ maxWidth: 100 })
  const { messages, pending, usage, send } = useMessages(conversation?.messages)
  const { focus } = useFocusManager()

  // Clear terminal on first render.
  useClearScreen()

  // Stop server on exit.
  useLayoutEffect(() => {
    process.on("exit", () => server?.stop())
  }, [server])

  useEffect(() => {
    focus("CHAT_INPUT")
  }, [messages, focus])

  if (!server) {
    return null
  }

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
          <CoreMessageBubble key={index} message={message} />
        ))}
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
          
        <TextInput id="CHAT_INPUT" onSubmit={send} />
      </Box>
    </Box>
  )
}