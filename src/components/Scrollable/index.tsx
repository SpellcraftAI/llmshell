import React, { useState, useEffect, useMemo } from "react"
import { Box, Text, useInput, type BoxProps } from "ink"
import { useSIGINTListener } from "@/hooks/useSIGINTListener"

interface ScrollableProps<T> extends BoxProps {
  items: T[];
  itemHeight?: number;
  visibleItems: number;
  // highlightColor?: string;
  isActive?: boolean;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect?: (item: T, index: number) => void | Promise<void>;
}

const VERTICAL_BAR = "│"

const ScrollThumb: React.FC<{ show: boolean; position: number; height: number; totalHeight: number }> = 
  ({ show, position, height, totalHeight }) => {
    if (!show) return null
    return (
      <Box flexDirection="column" marginLeft={1} height={totalHeight}>
        {Array(position).fill(VERTICAL_BAR).map((char, i) => (
          <Text dimColor key={`space-${i}`}>{char}</Text>
        ))}
        {Array(height).fill(VERTICAL_BAR).map((char, i) => (
          <Text key={`thumb-${i}`}>{char}</Text>
        ))}
        {Array(totalHeight - position - height).fill(VERTICAL_BAR).map((char, i) => (
          <Text dimColor key={`space-${i}`}>{char}</Text>
        ))}
      </Box>
    )
  }

export function Scrollable<T>({ 
  items,
  itemHeight = 3,
  visibleItems, 
  // highlightColor,
  isActive = true,
  renderItem,
  onSelect,
  ...props
}: ScrollableProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewportStart, setViewportStart] = useState(0)

  useSIGINTListener(isActive)

  useEffect(() => {
    if (currentIndex < viewportStart) {
      setViewportStart(currentIndex)
    } else if (currentIndex >= viewportStart + visibleItems) {
      setViewportStart(currentIndex - visibleItems + 1)
    }
  }, [currentIndex, viewportStart, visibleItems])

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setCurrentIndex(prev => Math.max(0, prev - 1))
      } else if (key.downArrow) {
        setCurrentIndex(prev => Math.min(items.length - 1, prev + 1))
      } else if (key.return) {
        onSelect && onSelect(items[currentIndex], currentIndex)
      }
    },
    { isActive: isActive }
  )

  const listItems = useMemo(
    () => {
      return items.slice(viewportStart, viewportStart + visibleItems).map((item, index) => {
        const isSelected = viewportStart + index === currentIndex
        return (
          <Box key={index}>
            {renderItem(item, isSelected)}
          </Box>
        )
      })
    }, 
    [currentIndex, items, viewportStart, visibleItems, renderItem]
  )

  const totalVisibleHeight = visibleItems * itemHeight
  const scrollThumbHeight = Math.max(itemHeight, Math.floor((visibleItems / items.length) * totalVisibleHeight))
  const scrollThumbPosition = Math.floor((viewportStart / (items.length - visibleItems)) * (totalVisibleHeight - scrollThumbHeight))

  return (
    <Box paddingX={1} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1} overflowY="hidden" {...props}>
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