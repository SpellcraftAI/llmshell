import { Box, Text, render } from "ink"
import { TextInput } from "./TextInput"
import { useState } from "react"
import { useTerminalWidth } from "./useTerminalWidth"


interface MessageProps {
  from: "you" | string
  text: string
}

const Message = ({ from, text }: MessageProps) => {
  const terminalWidth = useTerminalWidth(80)
  const color = from === "you" ? "blue" : undefined
  const prefix = from === "you" ? "You" : ""

  if (!terminalWidth) {
    return null
  }

  return (
    <Box flexDirection="column" width={terminalWidth}>
      <Text color={color}>
        {prefix}
      </Text>
        
      <Box borderStyle="round" borderColor={color} padding={1}>
        <Text>{text}</Text>
      </Box>
    </Box>
  )
}

const MessageView = () => {
  const [result, setResult] = useState<string[]>([])
  const previousMessages = 
    result.length
      ? result.map((text, index) => <Message key={index} from="you" text={text.trim()} />)
      : null

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        <Text dimColor>Your conversation will appear here.</Text>
        {previousMessages}
      </Box>

      <TextInput onSubmit={(input) => setResult((prev) => [...prev, input])} />
    </Box>
  )
}

render(<MessageView />)