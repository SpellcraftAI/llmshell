import { useTerminalSize } from "@/hooks/useTerminalSize"
import { Box, Text } from "ink"

export const CenterView = ({ children }: { children: React.ReactNode }) => {
  const terminalSize = useTerminalSize({ maxWidth: 100 })

  if (!terminalSize) {
    return null
  }

  const [terminalWidth] = terminalSize

  if (terminalWidth < 20) {
    return (
      <Text color="red">Terminal must be at least 20 columns wide.</Text>
    )
  }
  
  return (
    <Box 
      flexDirection="column" 
      justifyContent="center" 
      alignSelf="center"
      alignItems="center"
      width={terminalWidth - 4}
    >
      {children}
    </Box>
  )
}