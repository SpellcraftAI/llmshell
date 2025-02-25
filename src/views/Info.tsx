import { platform, release } from "os"
import { Text, useInput } from "ink"
import { Column, Row } from "@/components/Flex"
import { CenterView } from "./Center"
import { useClearScreen } from "@/hooks/useClearScreen"
import { useLayoutEffect, useMemo, useState } from "react"
import { getExamplesPath, getSessionsDir, getToolsPath, loadExamplesFromDisk, loadThreadsFromDisk, loadToolsFromDisk, type Thread } from "@/lib/log"
import type { CoreMessage, CoreTool } from "ai"
import { useRouter } from "@/lib/router"
import { YC } from "./easter/YC"
import { GSH } from "./easter/GSH"
import { ThemedText } from "@/components/Themed"

type EASTER_EGGS = "YC" | "GSH"

export const Info = () => {
  const [easterEgg, setEasterEgg] = useState<EASTER_EGGS | null>(null)
  const { page } = useRouter()
  useClearScreen()

  const [examples, setExamples] = useState<Record<string, CoreMessage[]> | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [tools, setTools] = useState<Record<string, CoreTool>>({})

  const examplesPromise = useMemo(() => loadExamplesFromDisk(), [])
  const threadsPromise = useMemo(() => loadThreadsFromDisk(), [])
  const toolsPromise = useMemo(() => loadToolsFromDisk(), [])

  useLayoutEffect(() => {
    (async () => {
      const examples = await examplesPromise ?? {}
      const threads = await threadsPromise ?? []
      const tools = await toolsPromise ?? {}
      
      setExamples(examples)
      setThreads(threads)
      setTools(tools)
    })()
  }, [examplesPromise, threadsPromise, toolsPromise])

  useInput(
    (input) => {
      if (input === "y") {
        setEasterEgg("YC")
      } else if (input === "g") {
        setEasterEgg("GSH")
      }
    }, 
    { isActive: page === "info" }
  )
  
  if (easterEgg) {
    switch (easterEgg) {
    case "YC":
      return <YC />

    case "GSH":
      return <GSH />

    default:
      throw new Error(`Unknown easter egg: ${easterEgg}`)
    }
  }

  return (
    <CenterView
      justifyContent="flex-start"
      alignItems="center"
      gap={1} 
      marginTop={2}
      paddingY={1}
      borderStyle="round" 
      borderDimColor
    >
      <ThemedText bold>Info</ThemedText>
      <Text dimColor>Information about your system.</Text>

      <Column gap={1}>
        <Column>
          <ThemedText>Platform</ThemedText>
          <Text dimColor>{platform()} {release()}</Text>
        </Column>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <ThemedText># Threads</ThemedText>
            <Text bold>{threads.length}</Text>
          </Row>
          <Text dimColor>{getSessionsDir()}</Text>
        </Column>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <ThemedText># Custom Examples</ThemedText>
            <Text bold>{Object.keys(examples ?? {}).length}</Text>
          </Row>
          <Text dimColor>{getExamplesPath()}</Text>
        </Column>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <ThemedText># Custom Tools</ThemedText>
            <Text bold>{Object.keys(tools).length}</Text>
          </Row>
          <Text dimColor>{getToolsPath()}</Text>
        </Column>
      </Column>
    </CenterView>
  )
}