import type { ForegroundColorName } from "ansi-styles"
import { Box, Text } from "ink"
import { LoadingDots } from "../LoadingDots"
import type { Props } from "node_modules/ink/build/components/Box"

export interface MessageBubbleProps {
  from: "you" | string
  text: string
  // border?: boolean
  waiting?: boolean
}

export interface MessageRowProps extends Props {
  children: React.ReactNode
  maxWidth?: number
}

export const MessageRow = ({ children, width, maxWidth = 96, ...props }: MessageRowProps) => {
  // const [width] = useTerminalSize()
  // const calculatedMaxWidth = useMemo(() => Math.min(maxWidth, width - 8), [maxWidth, width])
  return (
    <Box 
      flexDirection="row" 
      justifyContent="center"
      flexGrow={1}
      paddingBottom={1}
      // borderStyle="round" 
      // borderColor="green"
      width={width}
      // paddingX={2}
    >
      <Box 
        width={maxWidth} 
        // borderStyle="round" 
        // borderColor="green"
        {...props} 
      >
        {children}
      </Box>
    </Box>
  )
}

export const MessageBubble = ({ from, text, waiting = false }: MessageBubbleProps) => {
  const prefixColor: ForegroundColorName | undefined = from === "you" ? "blue" : "yellow"
  const textColor: ForegroundColorName | undefined = from === "you" ? "blue" : undefined
  const prefix = from === "you" ? "You" : from

  // const borderStyle = border ? "round" : undefined
  const borderColor = from === "you" ? "blue" : undefined

  const mode = from === "you" ? "send" : "receive"

  return (
    <Box 
      flexDirection={mode === "send" ? "row-reverse" : "row"} 
    >
      <Box 
        flexDirection="column"
        /**
         * Do not re-add these, no matter how tempted you are. Re-rendering the
         * Chat view janks out when Yoga tries to render this many boxes.
         */
        borderStyle="round"
        borderColor={borderColor}
        borderDimColor
        paddingX={2}
        paddingY={1}
        width="80%"
      >
        <Box marginBottom={1}>
          <Text bold color={prefixColor}>
            {prefix}
          </Text>
        </Box>
        
        <Box>
          {waiting ? <LoadingDots /> : <Text color={textColor}>{text}</Text>}
        </Box>
      </Box>
    </Box>
  )
}
