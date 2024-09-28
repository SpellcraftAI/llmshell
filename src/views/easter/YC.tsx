import { Box, Text } from "ink"
import { Column, Row } from "@/components/Flex"
import { useCallback, useEffect, useState } from "react"

const ASCII = `++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++.  =+++++++++. .++++++++++++
++++++++++++=   ++++++++   =++++++++++++
+++++++++++++=   ++++++   =+++++++++++++
++++++++++++++=   ++++.  =++++++++++++++
+++++++++++++++=  .++.  =+++++++++++++++
++++++++++++++++-  .:  =++++++++++++++++
+++++++++++++++++-    -+++++++++++++++++
++++++++++++++++++:  :++++++++++++++++++
++++++++++++++++++-  -++++++++++++++++++
++++++++++++++++++-  -++++++++++++++++++
++++++++++++++++++-  -++++++++++++++++++
++++++++++++++++++-  -++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++
++++++++++++++++++++++++++++++++++++++++`

const CHUNK_SIZE = 10
const createEmptyAscii = (): string => ASCII.replace(/[^\n]/g, " ")

export const YC: React.FC = () => {
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
      <Row gap={2} alignItems="flex-start" justifyContent="space-around" paddingX={2}>
        <Box alignItems="center" justifyContent="center" flexShrink={0}>
          <Text>{animatedAscii}</Text>
        </Box>

        <Column borderStyle="round" alignItems="center" justifyContent="flex-start" gap={1} paddingX={1}>
          <Text bold>Y Combinator</Text>
          <Column paddingX={1} gap={1}>
            <Text>
              YC reviewed a prototype of this tool and did not like it at all.
            </Text>

            <Text>
              We hope you have a better experience.
            </Text>
          </Column>
        </Column>
      </Row>
    </Column>
  )
}