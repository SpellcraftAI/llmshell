import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { Box, Text } from "ink"
import { getNewConversation, loadThreadsFromDisk, setSessionId, type Conversation } from "@/lib/log"
import { Scrollable } from "@/components/Scrollable"
import { CenterView } from "./Center"
import { useAppState } from "./state"
import { useRouter } from "./router"
import { FocusIndicator } from "@/components/FocusIndicator"
import { Column, Row } from "@/components/Flex"
import { useTerminalSize } from "@/hooks/useTerminalSize"

export type MenuOptionType = "NEW_THREAD" | "SETTINGS"

export interface MenuOption {
  type: MenuOptionType
  title: string
}

export interface ThreadsProps {
  initialConversations?: Conversation[]
  onSelect: (conversation: Conversation) => void | Promise<void>
}

const NEW_THREAD_OPTION: MenuOption = {
  type: "NEW_THREAD",
  title: "💬 New chat",
}

const SETTINGS_OPTION: MenuOption = {
  type: "SETTINGS",
  title: "⚙ Settings",
}


const NeedsApiKey = () => {
  const { navigate } = useRouter()
  
  return (
    <Box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
      <Text color="red">No API key set. Please update your settings.</Text>

      <FocusIndicator
        paddingX={1}
        inputHandler={(_, key) => {
          if (key.return) {
            navigate("settings")
          }
        }}
      >
        <Text>Settings</Text>
      </FocusIndicator>

    </Box>
  )
}

export const Threads = ({ onSelect }: ThreadsProps) => {
  const { navigate } = useRouter()
  const { state: { config, selectedThread, threads }, update } = useAppState()
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [, height] = useTerminalSize()

  useLayoutEffect(() => {
    if (!config.apiKey) {
      setNeedsApiKey(true)
    } else {
      setNeedsApiKey(false)
    }
  }, [config.apiKey])


  useLayoutEffect(() => {
    loadThreadsFromDisk().then((threads) => {
      update({ threads })
    })
  }, [update])

  useEffect(
    () => { 
      if (selectedThread) {
        onSelect?.(selectedThread)
      }
    }, 
    [onSelect, selectedThread]
  )

  const renderConversationItem = useCallback(
    (item: Conversation | MenuOption, isSelected: boolean) => {
      if ("type" in item) {
        return (
          <Row 
            alignItems="center" 
            justifyContent="center" 
            paddingX={1} 
            minWidth={16}
            borderStyle="round" 
            borderDimColor={!isSelected}
          >
            <Text bold dimColor={!isSelected}>{item.title}</Text>
          </Row>
        )
      }

      const assistantTextMessages = 
        item.messages
          .filter(({ role }) => role === "assistant")
          .filter(({ content }) => Array.isArray(content) && content[0].type === "text")

      // @ts-expect-error - We know that the last message is always of type
      // [{ type: "text", ... }]
      const title = assistantTextMessages.map(({ content }) => content[0].text).at(-1)?.trim() ?? "Untitled"
      const titlePreview = title.split("\n")[0].slice(0, 72)
      const date = new Date(item.timestamp).toLocaleString()
      const count = item.messages.filter(({ role }) => role !== "tool").length
      return (
        <Box flexDirection="column" borderStyle="round" borderDimColor={!isSelected} paddingX={1} flexGrow={1} width={60}>
          <Box flexDirection="row" justifyContent="space-between" gap={2}>
            <Box>
              <Text bold={isSelected}>
                {titlePreview}{titlePreview.length < title.length ? "…" : ""}
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

  return (
    <CenterView 
      // height={height}
      minHeight={height}
      overflow="hidden" 
      paddingTop={2}
      paddingBottom={1} 
      gap={1}
      // borderStyle="round" 
    >
    
      {/* <Column alignSelf="center" gap={1}>
        <Column justifyContent="center" alignItems="center">
          <Text bold>Welcome to GSH v2024.1.</Text>
          <Text dimColor>Now powered Claude Sonnet 3.5.</Text>
        </Column>
      </Column> */}
      <Column flexShrink={0}>
        <Text bold>Welcome to GSH v2024.1.</Text>
        <Text italic dimColor>Now powered Claude Sonnet 3.5.</Text>
      </Column>
    
      {needsApiKey
        ? <NeedsApiKey /> 
        : (
          <>
            <Scrollable
              borderStyle={threads.length > 0 ? "round" : undefined}
              borderDimColor
              paddingX={4}
              items={[NEW_THREAD_OPTION, SETTINGS_OPTION, ...threads]}
              renderItem={renderConversationItem}
              itemHeight={!threads.length ? 2 : 5}
              visibleItems={!threads.length ? 2 : Math.max(3, Math.floor(height / 5) - 1)}
              onSelect={async (item) => {
                if ("type" in item) {
                  switch (item.type) {
                  case "NEW_THREAD":
                    const newThread = await getNewConversation()
                    update({ selectedThread: newThread })
                    setSessionId(`${newThread.timestamp}`)
                    return
                  case "SETTINGS":
                    navigate("settings")
                    return
                  }
                }

                update({ selectedThread: item })
                setSessionId(`${item.timestamp}`)
              }}
            />

            {!threads.length && (
              <Box justifyContent="center" alignItems="center">
                <Text italic dimColor>No history yet. Create a new chat to get started.</Text>
              </Box>
            )}
          </>
        )}
    </CenterView>
  )
}