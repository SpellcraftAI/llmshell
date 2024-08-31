import { useLayoutEffect, useState } from "react"

interface UseTerminalSizeArgs {
  maxHeight?: number
  maxWidth?: number
}

export const useTerminalSize = ({ maxWidth = 0, maxHeight = 0 }: UseTerminalSizeArgs = { maxHeight: 0, maxWidth: 0 }) => {
  const [terminalSize, setTerminalSize] = useState<[number, number] | null>(null)

  useLayoutEffect(
    () => {
      const handleResize = () => {
        setTerminalSize([process.stdout.columns, process.stdout.rows])
      }

      process.stdout.on("resize", handleResize)
      handleResize()

      return () => { 
        process.stdout.off("resize", handleResize) 
      }
    },
    []
  )

  if (!terminalSize) {
    return null
  }

  const [width, height] = terminalSize
  return [Math.min(width, maxWidth), Math.min(height, maxHeight)]
}