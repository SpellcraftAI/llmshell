import { Box, Text } from "ink"
import { useLayoutEffect } from "react"
import { clearTerminal } from "ansi-escapes"

import { TextInput } from "@/components/TextInput"
import { MessageBubble } from "@/components/MessageBubble"
import { useTerminalSize } from "@/hooks/useTerminalWidth"
import { useMessages } from "@/hooks/useMessages"
import { useServer } from "@/hooks/useServer"
import { compactNumber } from "@/lib/number"
import type { Conversation } from "@/lib/log"
import type { CoreMessage } from "ai"

const CoreMessageBubble = ({ message }: { message: CoreMessage }) => {
  const from = message.role === "assistant" ? "Claude" : "you"

  if (Array.isArray(message.content)) {
    return message.content.map(
      (message, index) => (
        message.type === "text" && <MessageBubble key={index} from={from} text={message.text} />
      )
    )
  }

  return (
    <MessageBubble from={from} text={message.content} />
  )
}

export interface ChatProps {
  conversation?: Conversation
}

export const Chat = ({ conversation }: ChatProps) => {
  const server = useServer()
  const terminalSize = useTerminalSize({ maxWidth: 100 })
  const { formatted, pending, usage, send } = useMessages(conversation?.messages)

  useLayoutEffect(() => {
    // Clear terminal on first render.
    process.stdout.write(clearTerminal)
    // Stop server on exit.
    process.on("exit", () => server?.stop())
  }, [server])

  if (!terminalSize || !server) {
    return null
  }

  const [terminalWidth] = terminalSize
  if (terminalWidth < 20) {
    return (
      <Text color="red">Terminal must be at least 20 columns wide.</Text>
    )
  }

  return (
    <Box 
      width={terminalWidth - 4}
      flexDirection="column" 
      justifyContent="center"
      alignSelf="center" 
      paddingTop={1} 
      // borderStyle="round"
      // borderColor="red"
    >
      <Box 
        flexDirection="column" 
        alignSelf="center"
        rowGap={1}
        paddingX={4}
        width={terminalWidth - 4}
      >
        {formatted.map((message, index) => (
          <CoreMessageBubble key={index} message={message} />
        ))}

        {pending && (
          <MessageBubble from="Claude" text={pending.content} />
        )}
      </Box>

      <Box flexDirection="row" alignItems="flex-start" gap={1}>
        <Box 
          flexDirection="column" 
          alignItems="center" 
          alignSelf="flex-start"
          justifyContent="center" 
          borderStyle="round" 
          borderDimColor
          marginTop={2}
          paddingX={1}
          flexShrink={0}
        >
          <Text bold>Tokens</Text>
          <Text>{compactNumber(usage?.totalTokens ?? 0)}</Text>
        </Box>
          
        <TextInput onSubmit={send} />
      </Box>
    </Box>
  )
}