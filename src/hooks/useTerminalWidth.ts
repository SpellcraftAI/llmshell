import { useLayoutEffect, useState } from "react"

interface UseTerminalSizeArgs {
  maxHeight?: number
  maxWidth?: number
}

export const useTerminalSize = ({ maxWidth = Infinity, maxHeight = Infinity }: UseTerminalSizeArgs = { maxWidth: Infinity, maxHeight: Infinity }): [number, number] => {
  const [terminalSize, setTerminalSize] = useState([process.stdout.columns, process.stdout.rows])

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

  const [width, height] = terminalSize
  return [Math.min(width, maxWidth), Math.min(height, maxHeight)]
}