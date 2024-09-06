import { useTerminalSize } from "@/hooks/useTerminalSize"
import { Box, Text, type BoxProps } from "ink"

export interface CenterViewProps extends BoxProps {
  children: React.ReactNode
}

export const CenterView = ({ children, ...props }: CenterViewProps) => {
  const [terminalWidth] = useTerminalSize({ maxWidth: 100 })

  if (terminalWidth < 20) {
    return (
      <Text color="red">Terminal must be at least 20 columns wide.</Text>
    )
  }
  
  return (
    <Box 
      flexDirection="column" 
      justifyContent="flex-start" 
      alignSelf="center"
      alignItems="center"
      width={terminalWidth - 4}
      {...props}
    >
      {children}
    </Box>
  )
}