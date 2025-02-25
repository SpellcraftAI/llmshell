import { useCallback, useEffect, useLayoutEffect } from "react"
import { Box, Text } from "ink"
import { getNewThread, loadThreadsFromDisk, setSessionId, type Thread } from "@/lib/log"
import { Scrollable } from "@/components/Scrollable"
import { useAppState } from "@/lib/state"
import { useRouter } from "@/lib/router"
import { FocusIndicator } from "@/components/FocusIndicator"
import { Column } from "@/components/Flex"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { CenterView } from "./Center"
import { Themed, ThemedText } from "@/components/Themed"

export type MenuOptionType = "NEW_THREAD" | "SETTINGS"  | "INFO" | "ACTIVATE"

export interface MenuOption {
  type: MenuOptionType
  title: string
}

export interface ThreadsProps {
  initialConversations?: Thread[]
  onSelect: (conversation: Thread) => void | Promise<void>
}

const MENU_OPTIONS: MenuOption[] = [
  {
    type: "NEW_THREAD",
    title: "💬 New chat",
  },
  {
    type: "SETTINGS",
    title: "⚙ Settings",
  },
  {
    type: "ACTIVATE",
    title: "🔑 Activate",
  },
  {
    type: "INFO",
    title: "ℹ Info",
  },
]


const NeedsApiKey = () => {
  const { state: { config } } = useAppState()
  const { navigate } = useRouter()
  
  return (
    <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1} gap={1}>
      <Text color="red">No API key set for <Text bold>{config.model}</Text>.</Text>
      <Text dimColor>Please update your settings.</Text>

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
  const [, height] = useTerminalSize()

  const hasApiKey = 
    config.model === "GPT-4o" 
      ? Boolean(config.openaiApiKey) 
      : config.model === "Claude Sonnet 3.7" 
        ? Boolean(config.anthropicApiKey) 
        : false

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
    (item: Thread | MenuOption, isSelected: boolean) => {
      if ("type" in item) {
        return (
          <Themed
            flexDirection="row"
            alignItems="center" 
            justifyContent="center" 
            paddingX={1} 
            // minWidth={16}
            flexGrow={1}
            borderStyle="round" 
            borderDimColor={!isSelected}
          >
            <ThemedText bold={isSelected} dimColor={!isSelected}>{item.title}</ThemedText>
          </Themed>
        )
      }

      const assistantTextMessages = 
        item.messages
          .filter(({ role }) => role === "assistant")
          .filter(({ content }) => Array.isArray(content) && content[0].type === "text")

      // @ts-expect-error - We know that the last message is always of type
      // [{ type: "text", ... }]
      const title = assistantTextMessages.map(({ content }) => content[0].text).at(-1)?.trim() ?? "Untitled"
      const titlePreview: string = title.split("\n")[0].slice(0, 72)
      const date = new Date(item.timestamp).toLocaleString()
      const count = item.messages.filter(({ role }) => role !== "tool").length
      return (
        <Themed flexDirection="column" borderStyle="round" borderDimColor={!isSelected} paddingX={1} flexGrow={1} width={60}>
          <Box flexDirection="row" justifyContent="space-between" gap={2}>
            <Box>
              <ThemedText bold={isSelected} dimColor={!isSelected}>
                {titlePreview}{titlePreview.length < title.length ? "…" : ""}
              </ThemedText>
            </Box>

            <Box width={16} flexDirection="row" justifyContent="flex-end">
              <ThemedText dimColor={!isSelected}>{count} msgs</ThemedText>
            </Box>
          </Box>
          
          <Text dimColor>{date}</Text>
        </Themed>
      )
    },
    []
  )

  return (
    <CenterView
      flexDirection="column"
      justifyContent="flex-start"
      alignItems="center"
      // height={height}
      minHeight={height}
      overflow="hidden" 
      paddingTop={1}
      paddingBottom={1} 
      gap={1}
      // borderStyle="round" 
    >
      <Column flexShrink={1} alignItems="center">
        <ThemedText bold>LLM Shell 0.0.2</ThemedText>
        <Text dimColor>Powered by Claude Sonnet 3.7 and GPT-4o.</Text>
      </Column>
    
      {!hasApiKey
        ? <NeedsApiKey /> 
        : (
          <>
            <Scrollable
              // borderStyle={threads.length > 0 ? "round" : undefined}
              borderDimColor
              paddingX={4}
              items={[MENU_OPTIONS, ...threads]}
              flexGrow={threads.length ? 1 : 0}
              renderItem={renderConversationItem}
              itemHeight={!threads.length ? 2 : 5}
              visibleItems={!threads.length ? 2 : Math.max(3, Math.floor(height / 5) - 1)}
              onSelect={async (item) => {
                if ("type" in item) {
                  switch (item.type) {
                  case "NEW_THREAD":
                    const newThread = await getNewThread()
                    update({ selectedThread: newThread })
                    setSessionId(`${newThread.timestamp}`)
                    return
                  case "SETTINGS":
                    navigate("settings")
                    return

                  case "INFO":
                    navigate("info")
                    return

                  case "ACTIVATE":
                    navigate("activate")
                    return
                  }
                }

                update({ selectedThread: item })
                setSessionId(`${item.timestamp}`)
              }}
            />

            {!threads.length && (
              <Box flexGrow={1} justifyContent="center" alignItems="flex-start">
                <Text italic dimColor>No history yet. Create a new chat to get started.</Text>
              </Box>
            )}
          </>
        )}
    </CenterView>
  )
}