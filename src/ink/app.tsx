import { Box, Text, render } from "ink"
import { TextInput } from "./TextInput"
import { useEffect, useState } from "react"
import { useTerminalSize } from "./useTerminalWidth"
import { clearTerminal } from "ansi-escapes"


interface Message {
  from: "you" | string
  text: string
}

const MessageBubble = ({ from, text }: Message) => {
  const color = from === "you" ? "blue" : undefined
  const prefix = from === "you" ? "You" : from

  return (
    <Box flexDirection={from === "you" ? "row-reverse" : "row"}>
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text dimColor color={color}>
            {prefix}
          </Text>
        </Box>
        
        <Box borderStyle="round" borderColor={color} paddingX={1}>
          <Text color={color}>{text}</Text>
        </Box>
      </Box>
    </Box>
  )
}

const MessageView = () => {
  const terminalSize = useTerminalSize({ maxWidth: 100 })
  const [result, setResult] = useState<Message[]>([])

  useEffect(() => { process.stdout.write(clearTerminal) }, [])

  if (!terminalSize) {
    return null
  }

  const [terminalWidth] = terminalSize
  if (terminalWidth < 20) {
    return (
      <Text color="red">Terminal must be at least 20 columns wide.</Text>
    )
  }

  return (
    <Box flexDirection="column" alignSelf="center">
      <Box flexDirection="column" paddingTop={1} width={terminalWidth - 4}>

        <Box flexDirection="column" paddingX={4} width={terminalWidth - 4} rowGap={1}>
          {result.map(({ from, text }, index) => (
            <MessageBubble key={index} from={from} text={text.trim()} />
          ))}
        </Box>

        <TextInput 
          onSubmit={(text) => {
            setResult((prev) => [...prev, { from: "you", text }, { from: "Claude", text: "Test response!" }])
          }} 
        />
      </Box>
    </Box>
  )
}

render(<MessageView />)