import type { ForegroundColorName } from "ansi-styles"
import { Box, Text } from "ink"
import { LoadingDots } from "../LoadingDots"

interface Message {
  from: "you" | string
  text: string
  border?: boolean
  loading?: boolean
}

export const MessageBubble = ({ from, text, border = false, loading = false }: Message) => {
  const prefixColor: ForegroundColorName | undefined = from === "you" ? "blue" : "yellow"
  const textColor: ForegroundColorName | undefined = from === "you" ? "blue" : undefined
  const prefix = from === "you" ? "You" : from

  const borderStyle = border ? "round" : undefined
  const borderColor = border && from === "you" ? "blue" : undefined

  return (
    <Box flexDirection={from === "you" ? "row-reverse" : "row"}>
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>
          <Text dimColor color={prefixColor}>
            {prefix}
          </Text>
        </Box>
        
        <Box 
          paddingX={1} 
          borderStyle={borderStyle}
          borderColor={borderColor}
        >
          {loading ? <LoadingDots /> : <Text color={textColor}>{text}</Text>}
        </Box>
      </Box>
    </Box>
  )
}
