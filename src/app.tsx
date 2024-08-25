import { Box, Text } from "ink"
import { useEffect } from "react"
import { clearTerminal } from "ansi-escapes"

import { TextInput } from "@/components/TextInput"
import { MessageBubble } from "@/components/MessageBubble"
import { useTerminalSize } from "@/hooks/useTerminalWidth"
import { useMessages } from "@/hooks/useMessages"
import { useServer } from "@/hooks/useServer"


export default function App() {
  const server = useServer()
  const terminalSize = useTerminalSize({ maxWidth: 100 })
  const { formatted, pending, usage, send } = useMessages()

  // Clear terminal on first render.
  useEffect(() => { 
    process.stdout.write(clearTerminal) 
  }, [])

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
        {formatted.map(({ role, content }, index) => typeof content === "string" && (
          <MessageBubble 
            key={index} 
            from={role === "assistant" ? "Claude" : "you"} 
            text={content} 
          />
        ))}

        {pending && (
          <MessageBubble from="Claude" text={pending.content} />
        )}
      </Box>

      <Box flexDirection="row" alignItems="flex-start" gap={1}>
        <Box 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          borderStyle="round" 
          borderDimColor
          marginTop={4}
          paddingX={1}
          flexShrink={0}
        >
          <Text bold>Usage</Text>
          <Text>{usage?.totalTokens ?? 0}</Text>
        </Box>
          
        <TextInput onSubmit={send} />
      </Box>
    </Box>
  )
}