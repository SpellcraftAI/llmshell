import React, { useCallback, useState } from "react"
import { Box, useFocusManager, useInput, type Key } from "ink"
import type { Props } from "node_modules/ink/build/components/Box"
import { useSIGINTListener } from "@/hooks/useSIGINTListener"

interface MenuProps<T> extends Props {
  items: T[];
  isActive?: boolean;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelect?: (item: T, index: number) => void;
  onChange?: (selectedIndex: number) => void;
  defaultValue?: T
}

const findDefaultIndex = <T,>(items: T[], defaultValue: T | undefined): number => {
  if (defaultValue === undefined) return 0
  const index = items.indexOf(defaultValue)
  return index !== -1 ? index : 0
}

export const Menu = <T,>({
  items,
  flexDirection = "column",
  isActive = true,
  renderItem,
  onSelect,
  onChange,
  defaultValue,
  ...props
}: MenuProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(() => 
    findDefaultIndex(items, defaultValue)
  )
  
  const { focusPrevious, focusNext } = useFocusManager()
  useSIGINTListener(true)

  const handleInputKey = useCallback((input: string, key: Key) => {
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
      onChange?.(newIndex)
    }

    if (key.return) {
      onSelect?.(items[selectedIndex], selectedIndex)
    }
  }, [selectedIndex, items, flexDirection, focusPrevious, focusNext, onChange, onSelect])

  useInput(handleInputKey, { isActive })

  return (
    <Box flexDirection={flexDirection} {...props}>
      {items.map((item, index) => (
        <Box key={index}>
          {renderItem(item, isActive && index === selectedIndex)}
        </Box>
      ))}
    </Box>
  )
}