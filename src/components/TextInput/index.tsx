"use server"

import { Box, Text } from "ink"
import chalk from "chalk"
import { useKeyboard } from "./useKeyboard"
import { useCallback } from "react"
import { parseMarkdown } from "../MessageBubble/parse"
import { simpleMarkdown } from "@/lib/md"

export interface TextInputProps extends React.ComponentProps<typeof Box> {
  id?: string
  onSubmit?: (input: string) => void | Promise<void>
  markdownEditing?: boolean
}

const KeyboardKey = ({ children, ...props }: React.ComponentProps<typeof Text>) => (
  <Text color="black" dimColor={false} backgroundColor="rgb(160,160,160)" {...props}> {children} </Text>
)


export const TextInput = ({ onSubmit, markdownEditing = true, ...props }: TextInputProps) => {
  // const { isFocused } = useFocus({ autoFocus: true, id })
  const { text, cursorPosition, before, at, after } = useKeyboard({ onSubmit })
  const parseContentAround = useCallback(
    (content: string) => {
      if (!markdownEditing) return content
      
      const preceding = content.match(/^\s+/)?.[0] || ""
      const trailing = content.match(/\s+$/)?.[0] || ""
      const parsed = simpleMarkdown(content).trim()
  
      return `${preceding}${parsed}${trailing}`
    },
    [markdownEditing]
  )
  
  const beforeContent = parseContentAround(before)
  const afterContent = parseContentAround(after)

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
          {`${beforeContent}${chalk.bgRgb(150, 150, 150)(at || " ")}${afterContent}`}
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