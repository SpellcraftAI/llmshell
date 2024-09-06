import React, { useState, useEffect } from "react"
import { Box, useFocus, useInput, type BoxProps } from "ink"

interface FocusIndicatorProps extends BoxProps {
  children: React.ReactNode;
  color?: string;
  blink?: boolean;
  blinkInterval?: number;
  indicateFocus?: boolean;
  inputHandler?: Parameters<typeof useInput>[0];
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = ({
  children,
  color,
  blink = false,
  blinkInterval = 500,
  indicateFocus = true,
  inputHandler,
  ...props
}) => {
  const { isFocused } = useFocus({ autoFocus: true })
  const [isDim, setIsDim] = useState(true)

  useEffect(() => {
    if (!indicateFocus) {
      return
    }

    setIsDim(!isFocused)

    if (!blink) {
      return
    }

    const intervalId = setInterval(() => {
      setIsDim(prev => !prev)
    }, blinkInterval)

    return () => clearInterval(intervalId)
  }, [isFocused, blinkInterval, blink, indicateFocus])

  useInput(inputHandler ?? (() => {}), { isActive: isFocused })

  return (
    <Box 
      borderStyle="round" 
      borderColor={color} 
      borderDimColor={isDim}
      {...props}
    >
      {children}
    </Box>
  )
}