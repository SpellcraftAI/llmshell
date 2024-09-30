import { useTerminalSize } from "@/hooks/useTerminalSize"
import { Box, Text, type BoxProps } from "ink"

export interface CenterViewProps extends BoxProps {
  maxWidth?: number
  children: React.ReactNode
}

export const CenterView = ({ maxWidth = 80, children, ...props }: CenterViewProps) => {
  const [terminalWidth] = useTerminalSize({ maxWidth })

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
      {...props}
    >
      {children}
    </Box>
  )
}