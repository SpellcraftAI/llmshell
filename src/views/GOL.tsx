import React, { useState, useEffect, useLayoutEffect } from "react"
import chalk from "chalk"
import { Box, Text, useInput } from "ink"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { useSIGINTListener } from "@/hooks/useSIGINTListener"
import { clearTerminal } from "ansi-escapes"
// import { useClearScreen } from "@/hooks/useClearScreen"

const CELL_ALIVE = "█"
const CELL_DEAD = " "
const TOTAL_DURATION = 2000
const STATIC_DURATION = 300
const BORDER_DENSITY = 0.85
const HALF_OPACITY_COLOR = Math.round(255 * 0.5)

const letterPatterns = {
  T: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  Y: [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  C: [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  h: [[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  a: [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  t: [[0,1,0,0,0],[1,1,1,0,0],[0,1,0,0,0],[0,1,0,0,1],[0,0,1,1,0]]
}

const initializeGrid = (width: number, height: number) => {
  const grid = Array.from({ length: height }, () => Array(width).fill(false))
  const startX = Math.floor(width / 2) - 15
  const startY = Math.floor(height / 2) - 3

  const embedLetter = (letter: keyof typeof letterPatterns, offsetX: number) => {
    letterPatterns[letter].forEach((row, y) => {
      row.forEach((cell, x) => {
        const gridY = startY + y
        const gridX = startX + offsetX + x
        
        // Check if the position is within the grid bounds
        if (gridY >= 0 && gridY < height && gridX >= 0 && gridX < width) {
          if (cell) grid[gridY][gridX] = true
        }
      })
    })
  }

  embedLetter("T", 0)
  embedLetter("T", 6)
  embedLetter("Y", 12)
  embedLetter("C", 18)
  embedLetter("h", 24)
  embedLetter("a", 30)
  embedLetter("t", 36)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        grid[y][x] = Math.random() < BORDER_DENSITY
      }
    }
  }

  return grid
}

const nextGeneration = (grid: boolean[][]) => {
  return grid.map((row, i) =>
    row.map((cell, j) => {
      const neighbors = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
        .reduce((count, [dx, dy]) => count + (grid[i+dx]?.[j+dy] ? 1 : 0), 0)
      return neighbors === 3 || (cell && neighbors === 2)
    })
  )
}

export const GOL: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [width, height] = useTerminalSize()
  const [grid, setGrid] = useState(() => initializeGrid(width, height))
  const [isRunning, setIsRunning] = useState(true)

  useSIGINTListener(isRunning)

  useLayoutEffect(() => {
    return () => {
      process.stdout.write(clearTerminal)
    }
  }, [])

  useEffect(() => {
    const startTime = Date.now()
    const intervalId = setInterval(() => {
      const elapsedTime = Date.now() - startTime
      
      if (elapsedTime < STATIC_DURATION) {
        // Do nothing, keep the initial state
      } else if (elapsedTime < TOTAL_DURATION) {
        setGrid(nextGeneration)
      } else {
        clearInterval(intervalId)
        setIsRunning(false)
        onComplete()
      }
    }, 1000 / 20)

    return () => clearInterval(intervalId)
  }, [onComplete])

  useInput((input, key) => {
    if (key.escape || key.return || input === "q") {
      setIsRunning(false)
      onComplete()
    }
  }, { isActive: isRunning })

  if (!isRunning) return null

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={height} width={width}>
      {grid.map((row, i) => (
        <Text key={i}>
          {row.map((cell) => 
            chalk.rgb(
              HALF_OPACITY_COLOR,
              HALF_OPACITY_COLOR,
              HALF_OPACITY_COLOR
            )(cell ? CELL_ALIVE : CELL_DEAD)
          )}
        </Text>
      ))}
    </Box>
  )
}