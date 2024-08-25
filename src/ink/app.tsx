import { Box, Text, render } from "ink"
import { TextInput } from "./TextInput"
import { useCallback, useEffect, useState } from "react"
import { useTerminalSize } from "./useTerminalWidth"
import { clearTerminal } from "ansi-escapes"
import { useMessages } from "./stream"
import type { Server } from "bun"
import { startServer } from "@/lib/api"
import { useServer } from "./useServer"
import { debug } from "@/lib/log"

interface Message {
  from: "you" | string
  text: string
  border?: boolean
}

const MessageBubble = ({ from, text, border = false }: Message) => {
  const color = from === "you" ? "blue" : undefined
  const prefix = from === "you" ? "You" : from

  const borderStyle = border ? "round" : undefined
  const borderColor = border && from === "you" ? "blue" : undefined

  return (
    <Box flexDirection={from === "you" ? "row-reverse" : "row"} paddingBottom={1}>
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text dimColor color={color}>
            {prefix}
          </Text>
        </Box>
        
        <Box 
          paddingX={1} 
          borderStyle={borderStyle}
          borderColor={borderColor}
        >
          <Text color={color}>{text}</Text>
        </Box>
      </Box>
    </Box>
  )
}


export const App = () => {
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