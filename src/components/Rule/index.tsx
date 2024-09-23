import { Text } from "ink"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { Column } from "../Flex"

export const Rule = ({ text = "" }: { text?: string }) => {
  const [width] = useTerminalSize({ maxWidth: 80 })

  return (
    <Column paddingBottom={1} alignItems="center">
      <Text italic dimColor>{text}</Text>
      <Text dimColor>
        {"─".repeat(width - 8)}
      </Text>
    </Column>
  )
}
