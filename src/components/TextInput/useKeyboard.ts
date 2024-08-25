
import { useEffect, useState } from "react"
import { useApp, useInput } from "ink"
import { cursorHide, cursorShow } from "ansi-escapes"
import { getTextSegments, insertText, moveCursor, removeTextBefore, type CursorPosition } from "./cursor"
import { log } from "@/lib/log"

export const useKeyboard = (onSubmit?: (input: string) => void | Promise<void>) => {
  const { exit } = useApp()
  const [text, setText] = useState("")
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 })

  useEffect(() => {
    process.stdout.write(cursorHide)

    return () => {
      process.stdout.write(cursorShow)
    }
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

  useInput(async (input, key) => {
    if (key.escape) {
      exit()
    } else if (key.return) {
      handleEnter()
    } else if (key.backspace || key.delete) {
      handleBackspace()
    } else if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      handleArrowKeys(key)
    } else {
      if (input.length === 1) {
        const newText = insertText(text, cursorPosition, input)
        setText(newText)
        setCursorPosition({ x: cursorPosition.x + 1, y: cursorPosition.y })
      } else {
        input = input.replaceAll("\r", "\n")
        if (!input.includes("\n")) {
          const newText = insertText(text, cursorPosition, input)
          setText(newText)
          setCursorPosition({ x: cursorPosition.x + input.length, y: cursorPosition.y })
        } else {
          const lines = input.split("\n")
          await log("input", JSON.stringify(input))
          let editedText = text
          for (const line of lines) {
            editedText = insertText(editedText, cursorPosition, line + "\n")

            cursorPosition.x = 0
            cursorPosition.y += 1
          }
        
          setText(editedText)
          setCursorPosition(cursorPosition)
        }
      }
    }
  }, {
    isActive: true
  })

  const { before, at, after } = getTextSegments(text, cursorPosition)
  return { text, before, at, after, cursorPosition }
}