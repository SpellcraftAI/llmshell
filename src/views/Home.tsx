import { useCallback, useLayoutEffect, useState } from "react"
import { Box, Text } from "ink"
import { getConversations, getCurrentConversation, setSessionId, type Conversation } from "@/lib/log"
import { Scrollable } from "@/components/Scrollable"
import { CenterView } from "./Center"
import { Chat } from "./Chat"
import { useClearScreen } from "@/hooks/useClearScreen"

const newThread = {
  title: "Start a new thread"
} as const

export const Home = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  // useSIGINTListener()
  useClearScreen()
  
  useLayoutEffect(() => {
    getConversations().then(setConversations)
  }, [])

  const renderConversationItem = useCallback(
    (item: Conversation | typeof newThread, isSelected: boolean) => {
      if ("title" in item) {
        return (
          <Box paddingX={1} borderStyle="round" borderDimColor={!isSelected}>
            <Text bold dimColor={!isSelected}> {item.title} </Text>
          </Box>
        )
      }

      const assistantTextMessages = 
        item.messages
          .filter(({ role }) => role === "assistant")
          .filter(({ content }) => Array.isArray(content) && content[0].type === "text")

      // @ts-expect-error - We know that the last message is always a text message
      const title = assistantTextMessages.map(({ content }) => content[0].text).at(-1) ?? "Untitled"
      const date = new Date(item.timestamp).toLocaleString()
      const count = item.messages.filter(({ role }) => role !== "tool").length
      return (
        <Box flexDirection="column" borderStyle="round" borderDimColor={!isSelected} paddingX={1} flexGrow={1} width={60}>
          <Box flexDirection="row" justifyContent="space-between" gap={2}>
            <Box>
              <Text bold={isSelected}>
                {title.trim().slice(0, 72)}{title.trim().length >= 80 ? "…" : ""}
              </Text>
            </Box>

            <Box width={16} flexDirection="row" justifyContent="flex-end">
              <Text dimColor={!isSelected}>{count} msgs</Text>
            </Box>
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
            <Text dimColor italic>Now running on Claude Sonnet 3.5.</Text>
          </Box>

          {/* <Menu
            isActive={true}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            items={items}
            renderItem={(item, isSelected) => (
              <Text color={isSelected ? "green" : "white"}>{item}</Text>
            )}
            onSelect={(item, index) => {}}
          />  */}
    
          <Scrollable
            items={[newThread, ...conversations]}
            renderItem={renderConversationItem}
            itemHeight={4}
            visibleItems={4}
            onSelect={async (item) => {
              if ("title" in item) {
                // use current new session
                const newConversation = await getCurrentConversation()
                setSelectedConversation(newConversation)
                return
              }

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