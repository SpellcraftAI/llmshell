import React, { useCallback, useLayoutEffect, useMemo, useState } from "react"
import { sep } from "path"
import { Box, Text } from "ink"
import { useSIGINTListener } from "@/components/TextInput/useSIGINTListener"
import { getConversations, log, setSessionId, type Conversation } from "@/lib/log"
import { Scrollable } from "@/components/Scrollable"
import { parseJsonl } from "@/lib/jsonl"
import { CenterView } from "./Center"
import { Chat } from "./Chat"
import { useClearScreen } from "@/hooks/useClearScreen"
interface ConversationPreview {
  path: string
  title: string
  date: string
  messageCount: number
}

export const Home = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  useSIGINTListener()
  useClearScreen()
  
  useLayoutEffect(() => {
    getConversations().then(setConversations)
  }, [])
  
  const handleSelect = (item: Conversation) => {
    setSessionId(`${item.timestamp}`)
    // log("Selected conversation", item)
    // Here you can add logic to open or display the selected conversation
  }

  const renderConversationItem = useCallback(
    (item: Conversation, isSelected: boolean) => {
      const assistantTextMessages = item.messages.filter(({ role }) => role === "assistant").filter(({ content }) => Array.isArray(content) && content[0].type === "text")
      const title = assistantTextMessages.map(({ content }) => content[0].text).at(-1) ?? "Untitled"
      const date = new Date(item.timestamp).toLocaleString()
      const count = item.messages.filter(({ role }) => role !== "tool").length
      return (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Box width={40}>
              <Text wrap="truncate-end">{title.trim()}</Text>
            </Box>

            <Text dimColor> | {count} messages</Text>
          </Box>
          
          <Text dimColor>{date.padEnd(10)}</Text>
        </Box>
      )
    },
    []
  )

  const introView = (
    <CenterView>
      <Box flexDirection="column" paddingTop={2}>
        <Box flexDirection="column" gap={1}>
    
          <Box flexDirection="column" justifyContent="center" alignItems="center" alignSelf="center">
            <Text bold>Welcome to GSH v2024.1.</Text>
            <Text dimColor>Now running on Claude Sonnet 3.5.</Text>
          </Box>
    
          <Scrollable 
            items={conversations}
            renderItem={renderConversationItem}
            itemHeight={4}
            visibleItems={5}
            onSelect={(item, index) => {
              setSelectedConversation(item)
              setSessionId(`${item.timestamp}`)
            }}
          />
        </Box>
      </Box>
    </CenterView>
  )

  if (!selectedConversation) {
    return introView
  }

  return (
    <Chat conversation={selectedConversation} />
  )
}