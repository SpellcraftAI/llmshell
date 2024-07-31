import { parse } from "partial-json"

// Function to move cursor up
function moveCursorUp(lines) {
  Bun.write(Bun.stdout, "\u001B")
  Bun.write(Bun.stdout, `[${lines}A`)
}

// Function to write a message
function writeMessage(message) {
  Bun.write(Bun.stdout, message + "\n")
}

async function demo() {
  // Write some lines
  writeMessage("Line 1")
  writeMessage("Line 2")
  writeMessage("Line 3")
  
  // Wait for a second
  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  // Move cursor up 2 lines
  moveCursorUp(3)

  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  // Write a new message, which will overwrite "Line 2"
  writeMessage("New Line 2")
  
  // Move cursor to the bottom
  moveCursorUp(1)
  writeMessage("This is at the bottom")
}

demo()