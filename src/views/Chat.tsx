import { Box, Text } from "ink"

import { ChatInput } from "@/components/ChatInput"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { useMessages } from "@/hooks/useMessages"
import { compactNumber, compactUSD } from "@/lib/number"
import { SESSION_ID, type Thread } from "@/lib/log"
import { Column, Row } from "@/components/Flex"
import { Paginate } from "../components/Paginate"
import { useMemo } from "react"

export interface ChatProps {
  conversation?: Thread
}

export const Chat = ({ conversation }: ChatProps) => {
  const [width, height] = useTerminalSize({ maxWidth: 100 })
  const { messages, roundtrips, waiting, streaming, lastUsage, lastCost, totalCost, send } = useMessages({
    initialMessages: conversation?.messages.toReversed()
  })

  const editorView = useMemo(
    () => !streaming && (
      <Box
        flexDirection="row"
        alignItems="flex-start"
        alignSelf="center"
        gap={1}
        width={width - 4}
        paddingBottom={1}
      >
        <Box
          flexDirection="column"
          alignItems="center"
          alignSelf="flex-start"
          justifyContent="center"
          borderStyle="round"
          borderDimColor
          borderColor={streaming ? "yellow" : undefined}
          marginTop={1}
          paddingX={1}
          flexShrink={0}
          gap={1}
        >

          <Row gap={2}>
            <Column alignItems="center">
              <Text dimColor>Last Cost</Text>
              <Text dimColor>{compactUSD(lastCost.total)}</Text>
            </Column>

            <Column alignItems="center">
              <Text dimColor>Total Cost</Text>
              <Text dimColor>{compactUSD(totalCost.total)}</Text>
            </Column>
          </Row>

          <Row gap={2}>
            <Column alignItems="center">
              <Text dimColor>Tokens</Text>
              <Text dimColor>{compactNumber(lastUsage?.totalTokens)}</Text>
            </Column>

            <Column alignItems="center">
              <Text dimColor>Roundtrip</Text>
              <Text dimColor>{roundtrips} of 5</Text>
            </Column>
          </Row>
        </Box>

        <Box flexDirection="column" flexGrow={1} paddingTop={1}>
          <ChatInput id="CHAT_INPUT" onSubmit={send} />
          <Box paddingX={2} justifyContent="flex-end">
            <Text dimColor>Session ID: {SESSION_ID}</Text>
          </Box>
        </Box>
      </Box>
    ),
    [lastCost.total, lastUsage?.totalTokens, roundtrips, send, streaming, totalCost.total, width]
  )

  const pagesView = useMemo(
    () => {
      return (
        <Paginate paddingBottom={1} maxCharactersPerPage={1000} messages={messages} streaming={streaming} waiting={waiting} />
      )
    },
    [messages, streaming, waiting]
  )

  // Reverse messages for flex-reverse display, which prevents clipping and
  // forced scrolling up on update with <Static> or naive column.

  return (
    <Box flexDirection="column-reverse" minHeight={height} gap={0}>
      {editorView}
      {pagesView}
    </Box>
  )
}