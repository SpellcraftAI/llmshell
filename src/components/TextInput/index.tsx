"use server"

import { Box, Text, useFocus } from "ink"
import chalk from "chalk"
import { useKeyboard } from "./useKeyboard"
import { parseSync } from "../MessageBubble/CoreMessage"

export interface TextInputProps extends React.ComponentProps<typeof Box> {
  id?: string
  onSubmit?: (input: string) => void | Promise<void>
  markdownEditing?: boolean
}


export const TextInput = ({ onSubmit, markdownEditing = true, ...props }: TextInputProps) => {
  // const { isFocused } = useFocus({ autoFocus: true, id })
  const { text, cursorPosition, before, at, after } = useKeyboard({ onSubmit })
  
  // const showCursor = useBlinkingCursor()
  // const characterAtCursor = input[cursorPosition] || " "
  const trailingNewlines = text.match(/\n+$/)?.[0] || ""
  const beforeContent = markdownEditing ? parseSync(before) + trailingNewlines : before
  const afterContent = markdownEditing ? parseSync(after) : after

  return (
    <Box paddingX={1} paddingTop={1} flexDirection="column" flexGrow={1}>
      {/* <Box paddingLeft={1}>
        <Text dimColor>Enter your message below.</Text>
      </Box> */}

      <Box
        padding={1}
        borderStyle="round"
        borderDimColor
        // borderDimColor={!isFocused}
        {...props}
      >
        <Text wrap="wrap">
          {`${beforeContent}${chalk.inverse(at || " ")}${afterContent}`}
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