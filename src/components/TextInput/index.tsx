"use server"

import { Box, Text, useFocus } from "ink"
import chalk from "chalk"
import { useKeyboard } from "./useKeyboard"

export interface TextInputProps extends React.ComponentProps<typeof Box> {
  id?: string
  onSubmit?: (input: string) => void | Promise<void>
}


export const TextInput = ({ onSubmit, id, ...props }: TextInputProps) => {
  const { isFocused } = useFocus({ autoFocus: true, id })
  const { text, cursorPosition, before, at, after } = useKeyboard({ onSubmit, active: isFocused })
  
  // const showCursor = useBlinkingCursor()
  // const characterAtCursor = input[cursorPosition] || " "

  return (
    <Box paddingX={1} paddingY={1} flexDirection="column" flexGrow={1}>
      {/* <Box paddingLeft={1}>
        <Text dimColor>Enter your message below.</Text>
      </Box> */}

      <Box
        padding={1}
        borderStyle="round"
        borderDimColor
        {...props}
      >
        <Text wrap="wrap">
          {`${before}${chalk.inverse(at || " ")}${after}`}
        </Text>
      </Box>

      <Box paddingLeft={1} flexDirection="row" justifyContent="space-between">
        <Box flexDirection="column">
          <Text>Press <Text bold>⏎ ENTER</Text> 3x to send.</Text>
          <Text>Press <Text bold>ESC</Text>, <Text bold>Ctrl+C</Text>, or <Text bold>Ctrl+D</Text> to exit.</Text>
        </Box>

        <Box flexDirection="column">
          <Text dimColor>{text.length} chars</Text>
          <Text dimColor>⌖ ({cursorPosition.x},{cursorPosition.y})</Text>
        </Box>
      </Box>

      {/* <Box paddingLeft={1} paddingTop={1}>
        <Text dimColor>Footer text.</Text>
      </Box> */}
    </Box>
  )
}