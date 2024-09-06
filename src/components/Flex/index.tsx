import { Box, type BoxProps } from "ink"

interface FlexProps extends BoxProps {
  children: React.ReactNode;
}

export const Column = ({ children, ...props }: FlexProps) => {
  return (
    <Box flexDirection="column" {...props}>
      {children}
    </Box>
  )
}

export const Row = ({ children, ...props }: FlexProps) => {
  return (
    <Box flexDirection="row" {...props}>
      {children}
    </Box>
  )
}