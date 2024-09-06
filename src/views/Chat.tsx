import { Box, Text, useInput, type BoxProps } from "ink"
import { useEffect, useLayoutEffect, useMemo, useState } from "react"

import { TextInput } from "@/components/TextInput"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { useMessages } from "@/hooks/useMessages"
import { useServer } from "@/hooks/useServer"
import { compactNumber } from "@/lib/number"
import { SESSION_ID, type Conversation } from "@/lib/log"
import { CoreMessageBubble } from "@/components/MessageBubble/CoreMessage"
import type { CoreMessage } from "ai"
import { useResumeStdin } from "@/hooks/useResumeStdin"
import { Column } from "@/components/Flex"
import { useClearScreen } from "@/hooks/useClearScreen"

export interface ChatProps {
  conversation?: Conversation
}

interface StaticMessagesProps extends BoxProps {
  page?: number;
  pageSize?: number;
  messages: CoreMessage[];
  children: (message: CoreMessage, index: number) => React.ReactNode;
}

const StaticMessages = ({ 
  page = 0, 
  pageSize = 2, 
  messages, 
  children, 
  ...boxProps 
}: StaticMessagesProps) => {
  const [renderedMessages, setRenderedMessages] = useState<CoreMessage[]>([])

  useEffect(() => {
    const startIndex = page * pageSize
    const endIndex = startIndex + pageSize
    const pageMessages = messages.slice(startIndex, endIndex)
    
    setRenderedMessages(prevMessages => {
      const newMessages = [...prevMessages]
      pageMessages.forEach((message, index) => {
        newMessages[startIndex + index] = message
      })
      return newMessages
    })
  }, [messages, page, pageSize])

  const messageElements = useMemo(() => {
    const startIndex = page * pageSize
    return renderedMessages
      .slice(startIndex, startIndex + pageSize)
      .map((message, index) => children(message, startIndex + index))
  }, [renderedMessages, children, page, pageSize])

  return (
    <Box flexDirection="column-reverse" gap={1} {...boxProps}>
      {messageElements}
    </Box>
  )
}

const getMessageLength = (message: CoreMessage) => {
  if (typeof message.content === "string") {
    return message.content.length
  } else if (Array.isArray(message.content)) {
    return message.content.reduce((total, contentItem) => 
      total + (
        contentItem.type === "text" 
          ? contentItem.text.length 
          : contentItem.type === "tool-result" 
            ? new String(contentItem.result).length 
            : contentItem.type === "tool-call"
              ? JSON.stringify(contentItem.args).length
              : 0
      ), 0
    )
  }
  return 0
}

export const Chat = ({ conversation }: ChatProps) => {
  const server = useServer()
  const [page, setPage] = useState(0)
  const [width, height] = useTerminalSize({ maxWidth: 100 })
  const { messages, roundtrips, waiting, streaming, usage, send } = useMessages({ initialMessages: conversation?.messages.toReversed() })
  // useClearScreen()

  // const reversed = messages.toReversed()
  const PAGE_SIZE = 8
  let visibleMessageCount = 1

  const MAX_CHARS = 1000
  let charCount = 0

  for (const message of messages.slice(1)) {
    const messageLength = getMessageLength(message)
    if (charCount + messageLength <= MAX_CHARS) {
      charCount += messageLength
      visibleMessageCount++
    } else {
      break
    }
  }

  const staticMessages = messages.slice(visibleMessageCount)

  // const pageSize = 10
  const totalPages = Math.floor(staticMessages.length / PAGE_SIZE)

  useResumeStdin()

  // Stop server on exit.
  useLayoutEffect(() => {
    return () => server?.stop()
  }, [server])

  useInput((input, key) => {
    // write(JSON.stringify({ input, key }))
    const modKey = key.shift || key.ctrl || key.meta
    if (key.pageUp || (key.upArrow && modKey)) {
      if (page < totalPages) {
        setPage((prevPage) => prevPage + 1)
      }
    } else if (key.pageDown || (key.downArrow && modKey)) {
      if (page > 0) {
        setPage((prevPage) => prevPage - 1)
      }
    }
  })
  // Scroll to bottom on new messages.

  // useEffect(() => {
  //   if (page > 0) {
  //     process.stdout.cursorTo(0, 0)
  //     // setTimeout(() => write("\x1B[9999A"), 100)
  //   }
  // }, [page, write])

  /**
   * Static messages only update when a new message is added, and not for old
   * ones.
   */

  if (!server) {
    return null
  }

  const PagesInfo = ({ mode }: { mode: "top" | "bottom" }) => {
    if (totalPages < 1) {
      return null
    }
    
    const isTopPage = page === totalPages

    if (mode === "top" && isTopPage) {
      // horizontal line
      return (
        <Column paddingBottom={1} alignItems="center">
          <Text italic dimColor>Top of conversation</Text>
          <Text dimColor>
            {"─".repeat(width - 8)}
          </Text>
        </Column>
      )
    }
       
    return (
      <Box paddingX={2} paddingTop={mode === "bottom" ? 1 : 0} paddingBottom={mode === "top" ? 1 : 0} flexDirection="row" flexGrow={1} justifyContent="space-between">
        <Text color="gray">Page {page}/{totalPages}</Text>
        <Box flexDirection="column">
          {<Text bold>🔼 Alt ⌥ + Up ↑</Text>}
          {page !== 0 && <Text bold>🔽 Alt ⌥ + Down ↓</Text>}
        </Box>
      </Box>
    )
  }

  const editorView = (
    <Box 
      flexDirection="row" 
      alignItems="flex-start" 
      alignSelf="center" 
      gap={1} 
      width={width - 4} 
      paddingBottom={1}
      // borderStyle="round"
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
        <Box flexDirection="column" justifyContent="center" alignItems="center">
          <Text dimColor>Tokens</Text>
          <Text dimColor>{compactNumber(usage?.totalTokens ?? 0)}</Text>
        </Box>

        <Box flexDirection="column" justifyContent="center" alignItems="center">
          <Text dimColor>Roundtrip</Text>
          <Text dimColor>{roundtrips} of 5</Text>
        </Box>
      </Box>
          
      {/* <Text dimColor>  DEBUG: messages {messages.length}</Text> */}
      <Box flexDirection="column" flexGrow={1} gap={1}>
        <TextInput id="CHAT_INPUT" onSubmit={send} />
        {/* <Text dimColor>DEBUG | {JSON.stringify({ visibleMessageCount, charCount, totalPages, page })}</Text> */}
        <Text dimColor>  Session ID: {SESSION_ID}</Text>
      </Box>
    </Box>
  )

  const recentMessages = (
    <Box flexDirection="column-reverse" gap={1} flexGrow={1}>
      {/* {messages.toReversed().slice.map((message, index) => (
            <CoreMessageBubble key={messages.length - index} message={message} />
          ))} */}
      {waiting && <CoreMessageBubble message={{ role: "assistant", content: "..." }} waiting />}
      {messages.slice(0, visibleMessageCount).map((message, index) => (
        <CoreMessageBubble key={messages.length - index} message={message} />
      ))}
    </Box>
  )

  // Reverse messages for flex-reverse display, which prevents clipping and
  // forced scrolling up on update with <Static> or naive column.
  // messages.reverse()

  return (
    // <Box 
    //   flexDirection="column" 
    //   justifyContent="center"
    //   alignSelf="center" 
    //   paddingTop={1}
    //   width={width - 4}
    //   // borderStyle="round"
    //   // borderColor="red"
    // >
    <Box flexDirection="column-reverse" minHeight={height} gap={0}>
      {editorView}

      <Box flexDirection="column-reverse" width={width - 4} alignSelf="center">
        
        {page === 0 && recentMessages}
        {!streaming && (
          <>
            <PagesInfo mode="bottom" />
            <StaticMessages paddingBottom={1} page={page} pageSize={PAGE_SIZE} messages={staticMessages}>
              {(message, index) => <CoreMessageBubble key={index} message={message} />}
            </StaticMessages>
            <PagesInfo mode="top" />
          </>
        )}
      </Box>
    </Box>
    // </Box>
  )
}