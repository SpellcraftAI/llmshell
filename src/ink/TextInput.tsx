"use server"

import { useCallback, useEffect, useState } from "react"
import { Box, Text, useApp, useInput, useStdin } from "ink"
import { cursorHide } from "ansi-escapes"
import { useTerminalWidth } from "./useTerminalWidth"
import chalk from "chalk"
import { getTextSegments, insertText, moveCursor, removeTextBefore, type CursorPosition } from "./cursor"
export interface TextInputProps extends React.ComponentProps<typeof Box> {
  onSubmit?: (input: string) => void | Promise<void>
}

const SIGINT = () => {
  process.exit(130)
}

const useSIGINTListener = () => {
  const { exit } = useApp()
  const { stdin } = useStdin()

  const close = useCallback(
    (data: Buffer) => {
      const key = data.toString()
  
      // Ctrl+C, Ctrl+D
      if (key === "\x03" || key === "\x04") {
        exit()
        SIGINT()
      }
    },
    [exit]
  )

  useEffect(
    () => {
      process.stdin.resume()
      stdin.on("data", close)
      return () => {
        process.stdin.pause()
        stdin.removeListener("data", close)
      }
    },
    [close, exit, stdin]
  )
}

const useKeyboard = (onSubmit: TextInputProps["onSubmit"]) => {
  const { exit } = useApp()
  const [text, setText] = useState("")
  const [consecutiveEnter, setConsecutiveEnter] = useState(0)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 })

  useEffect(() => {
    process.stdout.write(cursorHide)
  }, [])

  const handleEnter = () => {
    setConsecutiveEnter(prev => prev + 1)
    if (consecutiveEnter >= 1 && text.trim()) {
      onSubmit?.(text)
      setText("")
      setCursorPosition({ x: 0, y: 0 })
      setConsecutiveEnter(0)
    } else {
      const newText = insertText(text, cursorPosition, "\n")
      setText(newText)
      setCursorPosition({ x: 0, y: cursorPosition.y + 1 })
    }
  }

  const handleBackspace = () => {
    const { newText, newPosition } = removeTextBefore(text, cursorPosition)
    setText(newText)
    setCursorPosition(newPosition)
  }

  const handleArrowKeys = (key: { leftArrow?: boolean; rightArrow?: boolean; upArrow?: boolean; downArrow?: boolean }) => {
    if (key.leftArrow) setCursorPosition(moveCursor("left", text, cursorPosition))
    else if (key.rightArrow) setCursorPosition(moveCursor("right", text, cursorPosition))
    else if (key.upArrow) setCursorPosition(moveCursor("up", text, cursorPosition))
    else if (key.downArrow) setCursorPosition(moveCursor("down", text, cursorPosition))
  }

  useInput((inputChar, key) => {
    if (key.escape) {
      exit()
    } else if (key.return) {
      handleEnter()
    } else if (key.backspace || key.delete) {
      handleBackspace()
    } else if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      handleArrowKeys(key)
    } else {
      setConsecutiveEnter(0)
      const newText = insertText(text, cursorPosition, inputChar)
      setText(newText)
      setCursorPosition({ ...cursorPosition, x: cursorPosition.x + 1 })
    }
  })

  const { before, at, after } = getTextSegments(text, cursorPosition)
  return { text, before, at, after, cursorPosition }
}


export const TextInput = ({ onSubmit, ...props }: TextInputProps) => {
  useSIGINTListener()

  const { cursorPosition, before, at, after } = useKeyboard(onSubmit)
  const terminalWidth = useTerminalWidth(100)
  
  // const showCursor = useBlinkingCursor()
  // const characterAtCursor = input[cursorPosition] || " "

  if (!terminalWidth) {
    return null
  }

  return (
    <Box paddingX={1} paddingY={2} flexDirection="column">
      <Text dimColor>{JSON.stringify({ cursorPosition })}</Text>
      <Box paddingLeft={1}>
        <Text bold color={"blue"}>You</Text>
      </Box>

      <Box
        padding={1}
        borderStyle="round" 
        borderColor="blue"
        width={terminalWidth - 4}
        {...props}
      >
        <Text>
          {`${before}${chalk.inverse(at || " ")}${after}`}
          {/* {`${charactersBeforeCursor}${showCursor ? "█" : characterAtCursor}${charactersAfterCursor}`} */}
        </Text>
      </Box>

      <Box paddingLeft={1} flexDirection="column">
        <Text dimColor>Hit [ENTER ⏎] twice to send.</Text>
        <Text dimColor>Use [ESC] or Ctrl+C/Ctrl+D to exit.</Text>
      </Box>
    </Box>
  )
}