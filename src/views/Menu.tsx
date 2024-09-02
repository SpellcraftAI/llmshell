import React, { useEffect, useState } from "react"
import { Box, render, Text, useFocus, useFocusManager, useInput } from "ink"
import type { Props } from "node_modules/ink/build/components/Box"
import { useSIGINTListener } from "@/components/TextInput/useSIGINTListener"

interface MenuProps<T> extends Props {
  items: T[];
  isActive?: boolean;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect: (item: T, index: number) => void;
  onChange?: (selectedIndex: number) => void; // New prop
}

interface FocusableProps<T> {
  item: T;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
}

const Focusable = <T,>({ item, renderItem }: FocusableProps<T>) => {
  const { isFocused } = useFocus()
  return (
    <Box>
      {renderItem(item, isFocused)}
    </Box>
  )
}

export const Menu = <T,>({
  items,
  flexDirection = "column",
  isActive = true,
  renderItem,
  onSelect,
  onChange,
  ...props
}: MenuProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { focusPrevious, focusNext } = useFocusManager()

  useEffect(
    () => {
      if (isActive) {
        focusNext()
      }
    },
    [focusNext, isActive]
  )
  
  useSIGINTListener(true)
  useInput(
    (input, key) => {
      let newIndex = selectedIndex
      if (flexDirection === "column") {
        if (key.upArrow) {
          newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
          focusPrevious()
        } else if (key.downArrow) {
          newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
          focusNext()
        }
      } else {
        if (key.leftArrow) {
          newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
          focusPrevious()
        } else if (key.rightArrow) {
          newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
          focusNext()
        }
      }

      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex)
        onChange && onChange(newIndex) // Call onChange when the selection changes
      }

      if (key.return) {
        onSelect(items[selectedIndex], selectedIndex)
      }
    },
    { isActive }
  )

  return (
    <Box flexDirection={flexDirection} {...props}>
      {/* <Text dimColor>Debug {JSON.stringify({ selectedIndex })}</Text> */}
      {items.map((item, index) => (
        <Focusable 
          key={index}
          item={item}
          renderItem={renderItem}
        />
      ))}
    </Box>
  )
}