import React, { useState, useMemo, useEffect } from "react"
import { Box, Text, useInput, type BoxProps } from "ink"
import type { CoreMessage } from "ai"
import { useResumeStdin } from "@/hooks/useResumeStdin"
import { Rule } from "@/components/Rule"
import { CoreMessageBubble } from "@/components/MessageBubble/CoreMessage"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { useAppState } from "@/lib/state"

interface PaginateProps extends BoxProps {
  maxCharactersPerPage: number
  messages: CoreMessage[];
  streaming?: boolean;
  waiting?: boolean;
}

const calculateMessageLength = (message: CoreMessage): number => {
  if (typeof message.content === "string") {
    return message.content.length
  } else if (Array.isArray(message.content)) {
    return message.content.reduce(
      (total, contentItem) => 
        total + (
          contentItem.type === "text" 
            ? contentItem.text?.length ?? 0
            : contentItem.type === "tool-result" 
              ? String(contentItem.result).length 
              : contentItem.type === "tool-call"
                ? JSON.stringify(contentItem.args).length
                : 0
        ), 
      0
    )
  }
  return 0
}

const PagesInfo = ({ totalPages, page, mode }: { page: number, totalPages: number, mode: "top" | "bottom" }) => {
  if (totalPages < 2) {
    return null
  }
  
  const isTopPage = page === totalPages - 1

  if (mode === "top" && isTopPage) {
    return <Rule text="Top of conversation" />
  }

  if (mode === "bottom" && page === 0) {
    return null
  }
     
  return (
    <Box paddingX={2} paddingTop={mode === "bottom" ? 1 : 0} paddingBottom={mode === "top" ? 1 : 0} flexDirection="row" flexGrow={1} justifyContent="space-between">
      <Text color="gray">Page {page + 1}/{totalPages}</Text>
      <Box flexDirection="column">
        {page < totalPages && <Text bold>🔼 Alt ⌥ + Up ↑</Text>}
        {page > 0 && <Text bold>🔽 Alt ⌥ + Down ↓</Text>}
      </Box>
    </Box>
  )
}

const truncate = (message: CoreMessage, end = 1000): CoreMessage => {
  if (typeof message.content === "string" && message.role !== "tool") {
    if (!end) {
      return message
    }
  
    if (message.content.length < end) {
      return message
    }
  
    const sliced = message.content.slice(0, end)
    const withDroppedLine = sliced.slice(0, sliced.indexOf("\n") || undefined)
  
    return {
      ...message,
      content: `${withDroppedLine}...`
    }
  }

  return message
}

export const Paginate: React.FC<PaginateProps> = ({ 
  maxCharactersPerPage,
  messages,
  streaming,
  waiting
}) => {
  const { state: { config } } = useAppState()
  const [width] = useTerminalSize({ maxWidth: 100 }) 
  const pages = useMemo(() => {
    if (streaming) {
      return [[messages?.[0], ...messages.slice(1, 2).map(truncate)]]  // Only include the last message while streaming
    }

    const calculatedPages: CoreMessage[][] = []
    let currentPage: CoreMessage[] = []
    let currentLength = 0

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const messageLength = calculateMessageLength(message)
      
      if (currentLength + messageLength > maxCharactersPerPage && currentPage.length > 0) {
        calculatedPages.push(currentPage)
        currentPage = []
        currentLength = 0
      }
      
      currentPage.push(message)
      currentLength += messageLength
    }

    if (currentPage.length > 0) {
      calculatedPages.push(currentPage)
    }

    return calculatedPages
  }, [messages, maxCharactersPerPage, streaming])

  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setCurrentPage(0)
  }, [pages.length])

  useResumeStdin()
  useInput(async (input, key) => {
    const modKey = key.meta || key.ctrl
    const altUp = key.upArrow && modKey
    const pageUp = key.pageUp

    if (altUp || pageUp) {
      setCurrentPage((prevPage) => Math.min(prevPage + 1, pages.length - 1))
    } else if (key.downArrow && modKey) {
      setCurrentPage((prevPage) => Math.max(prevPage - 1, 0))
    }
  },
  { isActive: true }
  )

  const currentPageMessages = pages[currentPage] || []

  return (
    <Box flexDirection="column-reverse" gap={1} width={width - 8} alignSelf="center">
      {!streaming && <PagesInfo page={currentPage} totalPages={pages.length} mode="bottom" />}

      {currentPage === 0 && waiting && (
        <CoreMessageBubble message={{ role: "assistant", content: "...", experimental_providerMetadata: { assistant: { model: config.model }} }} waiting />
      )}

      {currentPageMessages.map((message, index) => 
        streaming
          ? <CoreMessageBubble maxLength={2000} key={index} message={message} />
          : <CoreMessageBubble key={index} message={message} />
      )}

      {streaming && <Rule text="Streaming..." />}
      {!streaming && <PagesInfo page={currentPage} totalPages={pages.length} mode="top" />}
    </Box>
  )
}