import { useAppState } from "@/lib/state"
import { Text, Box, type BoxProps, type TextProps } from "ink"
import type { PropsWithChildren } from "react"

export const Themed = ({ children, ...props }: PropsWithChildren<BoxProps>) => {
  const { state: { config: { themeColor } } } = useAppState()
  return (
    <Box borderColor={themeColor} {...props}>
      {children}
    </Box>
  )
}

export const ThemedText = ({ children, ...props }: PropsWithChildren<TextProps>) => {
  const { state: { config: { themeColor } } } = useAppState()
  return (
    <Text color={themeColor} {...props}>
      {children}
    </Text>
  )
}