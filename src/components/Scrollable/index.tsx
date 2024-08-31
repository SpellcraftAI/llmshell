import React, { useState, useEffect, useMemo } from "react"
import { Box, Text, useInput } from "ink"
import { useSIGINTListener } from "@/components/TextInput/useSIGINTListener"

interface ScrollableProps<T> {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  itemHeight?: number;
  visibleItems: number;
  highlightColor?: string;
  onSelect?: (item: T, index: number) => void;
}

const VERTICAL_BAR = "│"

const ScrollThumb: React.FC<{ show: boolean; position: number; height: number; totalHeight: number }> = 
  ({ show, position, height, totalHeight }) => {
    if (!show) return null
    return (
      <Box flexDirection="column" marginLeft={1} height={totalHeight}>
        {Array(position).fill(" ").map((char, i) => (
          <Text key={`space-${i}`}>{char}</Text>
        ))}
        {Array(height).fill(VERTICAL_BAR).map((char, i) => (
          <Text key={`thumb-${i}`}>{char}</Text>
        ))}
      </Box>
    )
  }

export function Scrollable<T>({ 
  items,
  renderItem,
  itemHeight = 3,
  visibleItems, 
  highlightColor,
  onSelect
}: ScrollableProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewportStart, setViewportStart] = useState(0)

  useSIGINTListener()

  useEffect(() => {
    if (currentIndex < viewportStart) {
      setViewportStart(currentIndex)
    } else if (currentIndex >= viewportStart + visibleItems) {
      setViewportStart(currentIndex - visibleItems + 1)
    }
  }, [currentIndex, viewportStart, visibleItems])

  useInput((input, key) => {
    if (key.upArrow) {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setCurrentIndex(prev => Math.min(items.length - 1, prev + 1))
    } else if (key.return) {
      onSelect && onSelect(items[currentIndex], currentIndex)
    }
  })

  const listItems = useMemo(
    () => {
      return items.slice(viewportStart, viewportStart + visibleItems).map((item, index) => {
        const isSelected = viewportStart + index === currentIndex
        return (
          <Box key={index} borderStyle="round" borderDimColor={!isSelected} borderColor={isSelected ? highlightColor : undefined} paddingX={1}>
            {renderItem(item, isSelected)}
          </Box>
        )
      })
    }, 
    [currentIndex, highlightColor, items, viewportStart, visibleItems, renderItem]
  )

  const totalVisibleHeight = visibleItems * itemHeight
  const scrollThumbHeight = Math.max(itemHeight, Math.floor((visibleItems / items.length) * totalVisibleHeight))
  const scrollThumbPosition = Math.floor((viewportStart / (items.length - visibleItems)) * (totalVisibleHeight - scrollThumbHeight))

  return (
    <Box paddingX={1}>
      <Box flexDirection="column">
        {listItems}
      </Box>
      <ScrollThumb 
        show={items.length > visibleItems}
        position={scrollThumbPosition}
        height={scrollThumbHeight}
        totalHeight={totalVisibleHeight}
      />
    </Box>
  )
}