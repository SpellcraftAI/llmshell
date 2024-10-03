import { Column } from "@/components/Flex"
import { useClearScreen } from "@/hooks/useClearScreen"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { Box, Text, type BoxProps } from "ink"
import { useMemo } from "react"

export interface CenterViewProps extends BoxProps {
  maxWidth?: number
  children: React.ReactNode
}

const MIN_WIDTH = 70
const MIN_HEIGHT = 20

export const CenterView = ({ maxWidth = 80, children, ...props }: CenterViewProps) => {
  const [terminalWidth, terminalHeight] = useTerminalSize({ maxWidth })  
  const notWideEnough = terminalWidth < MIN_WIDTH
  const notTallEnough = terminalHeight < MIN_HEIGHT
  useClearScreen(notWideEnough || notTallEnough)

  const content = useMemo(
    () => {
      if (!notWideEnough && !notTallEnough) {
        return children
      }

      return (
        <Column justifyContent="flex-start" gap={1}>
          {notWideEnough && (
            <Column>
              <Text color="red">Terminal must be at least {MIN_WIDTH} columns wide.</Text>
              <Text color="yellow">(current: {terminalWidth})</Text>
            </Column>
          )}
          {notTallEnough && (
            <Column>
              <Text color="red">Terminal must be at least {MIN_HEIGHT} rows tall.</Text>
              <Text color="yellow">(current: {terminalHeight})</Text>
            </Column>
          )}
        </Column>
      )
    },
    [children, notTallEnough, notWideEnough, terminalHeight, terminalWidth]
  )
  
  return (
    <Box
      flexDirection="column" 
      justifyContent="center"
      alignSelf="center"
      alignItems="center"
      width={terminalWidth - 4}
      height={terminalHeight}
      {...props}
    >
      {content}
    </Box>
  )
}