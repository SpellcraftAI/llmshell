import { useEffect, useState } from "react"

export const useTerminalWidth = (max?: number) => {
  const [terminalWidth, setTerminalWidth] = useState<number>()

  useEffect(
    () => {
      const handleResize = () => {
        setTerminalWidth(process.stdout.columns || 0)
      }

      process.stdout.on("resize", handleResize)
      handleResize()

      return () => { 
        process.stdout.off("resize", handleResize) 
      }
    },
    []
  )

  if (terminalWidth && max) {
    return Math.min(terminalWidth, max)
  }

  return terminalWidth
}