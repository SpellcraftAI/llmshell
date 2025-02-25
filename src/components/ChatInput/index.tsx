"use server"

import { Box, Text } from "ink"
import chalk from "chalk"
import { useKeyboard } from "./useKeyboard"
import { useCallback } from "react"
import { simpleMarkdown } from "@/lib/md"
import { Themed } from "../Themed"
import { useAppState } from "@/lib/state"

export interface ChatInputProps extends React.ComponentProps<typeof Box> {
  id?: string
  onSubmit?: (input: string) => void | Promise<void>
  markdownEditing?: boolean
}

const KeyboardKey = ({ children, ...props }: React.ComponentProps<typeof Text>) => {
  const { state } = useAppState()
  return (
    <Text color={state.config.themeColor || "blue"} {...props}>{children}</Text>
  )
}


export const ChatInput = ({ onSubmit, markdownEditing = true, ...props }: ChatInputProps) => {
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
      <Themed
        paddingX={1}
        minHeight={4}
        borderStyle="round"
        borderDimColor
        {...props}
      >
        <Text wrap="wrap">
          {`${beforeContent}${chalk.bgRgb(150, 150, 150)(at || " ")}${afterContent}`}
        </Text>
      </Themed>

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