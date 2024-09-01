import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import type { Props } from "node_modules/ink/build/components/Box"
import { useSIGINTListener } from "@/components/TextInput/useSIGINTListener"

interface MenuProps<T> extends Props {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect: (item: T, index: number) => void;
  onChange?: (selectedIndex: number) => void; // New prop
}

export const Menu = <T,>({
  items,
  flexDirection = "column",
  renderItem,
  onSelect,
  onChange,
}: MenuProps<T>) => {
  useSIGINTListener()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((input, key) => {
    let newIndex = selectedIndex
    if (flexDirection === "column") {
      if (key.upArrow) {
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
      } else if (key.downArrow) {
        newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
      }
    } else {
      if (key.leftArrow) {
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
      } else if (key.rightArrow) {
        newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
      }
    }

    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex)
      onChange && onChange(newIndex) // Call onChange when the selection changes
    }

    if (key.return) {
      onSelect(items[selectedIndex], selectedIndex)
    }
  })

  return (
    <Box flexDirection={flexDirection}>
      <Text dimColor>Debug {JSON.stringify({ selectedIndex })}</Text>
      {items.map((item, index) => (
        <Box key={index}>
          {renderItem(item, index === selectedIndex)}
        </Box>
      ))}
    </Box>
  )
}