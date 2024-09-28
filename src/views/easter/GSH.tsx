import { Box, Text } from "ink"
import { Column, Row } from "@/components/Flex"
import { useCallback, useEffect, useState } from "react"

const ASCII = `             _     
  __ _  ___ | |__    GSH Shell
 / _\` |/ __|| '_ \\ 
| (_| |\__ \\| | | |  Built by GPT Labs
 \__, ||___/|_| |_|  (c) 2022 GPT Labs License
 |___/
 
   __  ______  ____ _   UPG CLI
 / / / / __ \\/ __ \`/    
/ /_/ / /_/ / /_/ /     
\\__,_/ .___/\\__, /    Built by Spellcraft Inc
    /_/    /____/       (c) 2023 MIT                       
 `

const CHUNK_SIZE = 10
const createEmptyAscii = (): string => ASCII.replace(/[^\n]/g, " ")

export const GSH: React.FC = () => {
  const [animatedAscii, setAnimatedAscii] = useState<string>(createEmptyAscii())
  const [remainingIndices, setRemainingIndices] = useState<number[]>([])

  const initializeAnimation = useCallback(() => {
    const indices: number[] = []
    for (let i = 0; i < ASCII.length; i++) {
      if (ASCII[i] !== " " && ASCII[i] !== "\n") {
        indices.push(i)
      }
    }
    setRemainingIndices(indices)
  }, [])

  useEffect(() => {
    initializeAnimation()
  }, [initializeAnimation])

  useEffect(() => {
    if (remainingIndices.length === 0) return

    const timer = setTimeout(() => {
      const chunkSize = Math.min(CHUNK_SIZE, remainingIndices.length)
      const newAscii = animatedAscii.split("")

      for (let i = 0; i < chunkSize; i++) {
        const randomIndex = Math.floor(Math.random() * remainingIndices.length)
        const charIndex = remainingIndices[randomIndex]
        newAscii[charIndex] = ASCII[charIndex]
        remainingIndices.splice(randomIndex, 1)
      }

      setAnimatedAscii(newAscii.join(""))
      setRemainingIndices([...remainingIndices])
    }, 100)

    return () => clearTimeout(timer)
  }, [remainingIndices, animatedAscii])

  return (
    <Column paddingTop={2}>
      <Row gap={4} alignItems="center" justifyContent="center" paddingX={2}>
        <Box alignItems="center" justifyContent="center" flexShrink={0}>
          <Text color="yellow" dimColor>{animatedAscii}</Text>
        </Box>

        <Column borderStyle="round" alignItems="center" justifyContent="center" gap={1} paddingX={1}>
          <Text bold>GSH & UPG</Text>
          <Column paddingX={1} gap={1}>
            <Text>
              {"This builds on GSH and UPG, our projects from 2022-23 under GPT Labs."}
            </Text>

            <Text>
              {`The engineers on the project were:

1. Christian Lewis (@ctjlewis)
2. Andi Duro (@Nexuist)
3. Marina de la Rosa (@amphetamarina)`}
            </Text>
          </Column>
        </Column>
      </Row>
    </Column>
  )
}