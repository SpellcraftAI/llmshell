import React, { useState } from "react"
import { Box, useInput } from "ink"
import type { Props } from "node_modules/ink/build/components/Box"
import { useSIGINTListener } from "@/components/TextInput/useSIGINTListener"

interface MenuProps<T> extends Props {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect: (item: T, index: number) => void;
}

export const Menu = <T,>({
  items,
  flexDirection = "column",
  renderItem,
  onSelect,
}: MenuProps<T>) => {
  useSIGINTListener()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((input, key) => {
    if (flexDirection === "column") {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
      }
    } else {
      if (key.leftArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
      } else if (key.rightArrow) {
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
      }
    }

    if (key.return) {
      onSelect(items[selectedIndex], selectedIndex)
    }
  })

  return (
    <Box flexDirection={flexDirection}>
      {items.map((item, index) => (
        <Box key={index}>
          {renderItem(item, index === selectedIndex)}
        </Box>
      ))}
    </Box>
  )
}