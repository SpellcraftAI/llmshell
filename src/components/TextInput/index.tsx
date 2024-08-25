"use server"

import { Box, Text } from "ink"
import chalk from "chalk"
import { useSIGINTListener } from "./useSIGINTListener"
import { useKeyboard } from "./useKeyboard"

export interface TextInputProps extends React.ComponentProps<typeof Box> {
  onSubmit?: (input: string) => void | Promise<void>
}


export const TextInput = ({ onSubmit, ...props }: TextInputProps) => {
  useSIGINTListener()

  const { text, cursorPosition, before, at, after } = useKeyboard(onSubmit)
  
  // const showCursor = useBlinkingCursor()
  // const characterAtCursor = input[cursorPosition] || " "

  return (
    <Box paddingX={1} paddingY={1} flexDirection="column" flexGrow={1}>
      <Box paddingLeft={1}>
        <Text dimColor>Enter your message below.</Text>
      </Box>

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
          <Text dimColor>Hit [ENTER ⏎] 3x to send.</Text>
          <Text dimColor>Use [ESC] or Ctrl+C/Ctrl+D to exit.</Text>
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