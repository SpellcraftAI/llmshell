import { useState } from "react"
import { Box, Text, useFocus, useInput } from "ink"

interface MenuProps<T> {
  items: T[][]
  onSelect: (item: T) => void
}

interface CursorPosition {
  x: number
  y: number
}

export const Menu = <T extends React.ReactNode,>({ items, onSelect }: MenuProps<T>) => {
  const { isFocused } = useFocus({ autoFocus: true })
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 })

  const maxY = items.length - 1
  const maxX = Math.max(...items.map(row => row.length)) - 1

  useInput((_, key) => {
    if (key.leftArrow) {
      setCursorPosition(prev => ({ ...prev, x: Math.max(0, prev.x - 1) }))
    } else if (key.rightArrow) {
      setCursorPosition(prev => ({ ...prev, x: Math.min(maxX, prev.x + 1) }))
    } else if (key.upArrow) {
      setCursorPosition(prev => ({ ...prev, y: Math.max(0, prev.y - 1) }))
    } else if (key.downArrow) {
      setCursorPosition(prev => ({ ...prev, y: Math.min(maxY, prev.y + 1) }))
    } else if (key.return) {
      const selectedItem = items[cursorPosition.y]?.[cursorPosition.x]
      if (selectedItem) {
        onSelect(selectedItem)
      }
    }
  }, { isActive: isFocused })

  return (
    <Box flexDirection="column" gap={1}>
      {items.map((row, rowIndex) => (
        <Box flexDirection="row" key={rowIndex} gap={1} flexWrap="wrap">
          {row.map((item, colIndex) => {
            const selected = rowIndex === cursorPosition.y && colIndex === cursorPosition.x
            return (
              <Box borderDimColor={!selected} borderStyle="round" key={colIndex} flexShrink={0} paddingX={1}>
                <Text dimColor={!selected}>
                  {item}
                </Text>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}