import { Box, Text } from "ink"

interface Message {
  from: "you" | string
  text: string
  border?: boolean
}

export const MessageBubble = ({ from, text, border = false }: Message) => {
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
