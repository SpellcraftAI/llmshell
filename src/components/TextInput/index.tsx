"use server"

import { Box, Text } from "ink"
import chalk from "chalk"
import { useKeyboard } from "./useKeyboard"
import { parseSync } from "../MessageBubble/CoreMessage"

export interface TextInputProps extends React.ComponentProps<typeof Box> {
  id?: string
  onSubmit?: (input: string) => void | Promise<void>
  markdownEditing?: boolean
}

const KeyboardKey = ({ children, ...props }: React.ComponentProps<typeof Text>) => (
  <Text color="white" backgroundColor="rgb(50,50,50)" {...props}> {children} </Text>
)

export const TextInput = ({ onSubmit, markdownEditing = true, ...props }: TextInputProps) => {
  // const { isFocused } = useFocus({ autoFocus: true, id })
  const { text, cursorPosition, before, at, after } = useKeyboard({ onSubmit })
  
  // const showCursor = useBlinkingCursor()
  // const characterAtCursor = input[cursorPosition] || " "
  const beforePrecedingNewlines = before.match(/^\n+/)?.[0] || ""
  const beforeTrailingNewlines = before.match(/\n+$/)?.[0] || ""
  const afterPrecedingNewlines = after.match(/^\n+/)?.[0] || ""
  const afterTrailingNewlines = after.match(/\n+$/)?.[0] || ""
  const beforeContent = markdownEditing ? beforePrecedingNewlines + parseSync(before) + beforeTrailingNewlines : before
  const afterContent = markdownEditing ? afterPrecedingNewlines + parseSync(after) + afterTrailingNewlines : after

  return (
    <Box paddingX={1} flexDirection="column" flexGrow={1}>
      <Box
        paddingX={1}
        minHeight={4}
        borderStyle="round"
        borderDimColor
        {...props}
      >
        <Text wrap="wrap">
          {`${beforeContent}${chalk.inverse(at || " ")}${afterContent}`}
        </Text>
      </Box>

      <Box paddingX={1} flexDirection="row" alignItems="flex-end" justifyContent="space-between">
        <Box flexDirection="column">
          <Text dimColor>Press <KeyboardKey>⏎ ENTER</KeyboardKey> 3x to send.</Text>
          <Text dimColor>Press <KeyboardKey>ESC</KeyboardKey>, <KeyboardKey>Ctrl+C</KeyboardKey>, or <KeyboardKey>Ctrl+D</KeyboardKey> to exit.</Text>
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