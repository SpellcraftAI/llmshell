import { useState } from "react"
import { Box, render, Text } from "ink"
import { Menu } from "./Menu" // Assuming Menu component is in a separate file

const App = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lastAction, setLastAction] = useState("")
  const items = ["Item 1", "Item 2", "Item 3", "Item 4"]

  const handleSelect = (item: string, index: number) => {
    setLastAction(`Selected: ${item} at index ${index}`)
    setSelectedIndex(index)
  }

  return (
    <Box flexDirection="column">
      <Menu
        flexDirection="row"
        items={items}
        renderItem={(item, isSelected) => (
          <Text color={isSelected ? "green" : "white"}>{item}</Text>
        )}
        onSelect={handleSelect}
      />

      <Box flexDirection="column" marginTop={1}>
        <Text>Debug Info:</Text>
        <Text>Selected Index: {selectedIndex}</Text>
        <Text>Total Items: {items.length}</Text>
      </Box>
      <Text>Last Action: {lastAction}</Text>
    </Box>
  )
}

render(<App />)