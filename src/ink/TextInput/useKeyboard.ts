
import { useEffect, useState } from "react"
import { useApp, useInput } from "ink"
import { cursorHide } from "ansi-escapes"
import { getTextSegments, insertText, moveCursor, removeTextBefore, type CursorPosition } from "../cursor"

export const useKeyboard = (onSubmit?: (input: string) => void | Promise<void>) => {
  const { exit } = useApp()
  const [text, setText] = useState("")
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 })

  useEffect(() => {
    process.stdout.write(cursorHide)
  }, [])

  const handleEnter = () => {
    if (text.endsWith("\n\n")) {
      if (text.trim()) {
        onSubmit?.(text)
        setText("")
        setCursorPosition({ x: 0, y: 0 })
      }
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

  useInput((input, key) => {
    if (key.escape) {
      exit()
    } else if (key.return) {
      handleEnter()
    } else if (key.backspace || key.delete) {
      handleBackspace()
    } else if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      handleArrowKeys(key)
    } else {
      const newText = insertText(text, cursorPosition, input)
      setText(newText)
      setCursorPosition({ ...cursorPosition, x: cursorPosition.x + input.length })
    }
  })

  const { before, at, after } = getTextSegments(text, cursorPosition)
  return { text, before, at, after, cursorPosition }
}