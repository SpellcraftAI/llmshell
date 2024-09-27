/**
 * Not used presently, but styles a blinking cursor.
 */

import chalk from "chalk"
import { useCallback, useEffect, useState } from "react"

export const useCursorStyle = (
  blinkInterval: number = 600,
  fadeSteps: number = 10
) => {
  const [opacity, setOpacity] = useState(1)
  const [isIncreasing, setIsIncreasing] = useState(false)

  useEffect(() => {
    const intervalTime = blinkInterval / (fadeSteps * 2)
    
    const intervalId = setInterval(() => {
      setOpacity((prevOpacity) => {
        if (prevOpacity >= 1) {
          setIsIncreasing(false)
          return 1 - 1 / fadeSteps
        } else if (prevOpacity <= 0) {
          setIsIncreasing(true)
          return 1 / fadeSteps
        } else {
          return isIncreasing 
            ? Math.min(prevOpacity + 1 / fadeSteps, 1) 
            : Math.max(prevOpacity - 1 / fadeSteps, 0)
        }
      })
    }, intervalTime)

    return () => clearInterval(intervalId)
  }, [blinkInterval, fadeSteps, isIncreasing])

  const styleCursor = useCallback((char: string) => {
    const bgColor = Math.round(255 * opacity)
    const fgColor = Math.round(255 * (1 - opacity))
    return chalk.rgb(fgColor, fgColor, fgColor).bgRgb(bgColor, bgColor, bgColor)(char || " ")
  }, [opacity])

  return styleCursor
}