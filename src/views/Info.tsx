import { platform, release } from "os"
import { Text } from "ink"
import { Column, Row } from "@/components/Flex"
import { CenterView } from "./Center"
import { useClearScreen } from "@/hooks/useClearScreen"
import { useLayoutEffect, useMemo, useState } from "react"
import { getExamplesPath, getSessionsDir, getToolsPath, loadExamplesFromDisk, loadThreadsFromDisk, loadToolsFromDisk, type Thread } from "@/lib/log"
import type { CoreMessage, CoreTool } from "ai"

export const Info = () => {
  useClearScreen()

  const [examples, setExamples] = useState<Record<string, CoreMessage[]> | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [tools, setTools] = useState<Record<string, CoreTool>>({})

  const examplesPromise = useMemo(() => loadExamplesFromDisk(), [])
  const threadsPromise = useMemo(() => loadThreadsFromDisk(), [])
  const toolsPromise = useMemo(() => loadToolsFromDisk(), [])

  useLayoutEffect(() => {
    (async () => {
      const examples = await examplesPromise
      const threads = await threadsPromise
      const tools = await toolsPromise
      
      setExamples(examples)
      setThreads(threads)
      setTools(tools)
    })()
  }, [examplesPromise, threadsPromise, toolsPromise])

  return (
    <CenterView 
      alignItems="center"
      gap={1} 
      marginTop={2}
      paddingY={1}
      borderStyle="round" 
      borderDimColor
    >
      <Text bold>Info</Text>
      <Text dimColor>Information about your system.</Text>

      <Column gap={1}>
        <Row gap={2} justifyContent="space-between">
          <Text>Platform</Text>
          <Text dimColor>{platform()} {release()}</Text>
        </Row>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <Text># Threads</Text>
            <Text bold>{threads.length}</Text>
          </Row>
          <Text dimColor>{getSessionsDir()}</Text>
        </Column>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <Text># Custom Examples</Text>
            <Text bold>{Object.keys(examples ?? {}).length}</Text>
          </Row>
          <Text dimColor>{getExamplesPath()}</Text>
        </Column>

        <Column>
          <Row gap={2} justifyContent="space-between">
            <Text># Custom Tools</Text>
            <Text bold>{Object.keys(tools).length}</Text>
          </Row>
          <Text dimColor>{getToolsPath()}</Text>
        </Column>
      </Column>
    </CenterView>
  )
}