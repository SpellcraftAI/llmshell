import { spawn, ChildProcess } from "child_process"
import { getShellCommand } from "./internals/getShellCommand"

const ENCODER = new TextEncoder()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type KeyInput = string | number[] | Uint8Array;

// Simulate a keypress
function simulateKeypress(key: KeyInput): Uint8Array {
  if (typeof key === "string") {
    switch (key) {
    case "\n":
      return new Uint8Array([13, 10]) // Carriage return + Line feed
    case "backspace":
      return new Uint8Array([8, 32, 8])
    default:
      return ENCODER.encode(key)
    }
  } else if (Array.isArray(key)) {
    return new Uint8Array(key)
  } else {
    return key
  }
}

type Action = 
  | { type: "type"; content: KeyInput }
  | { type: "delete"; amount: number };

// Create a stream of simulated keypresses with delays
const keypressStream = new ReadableStream<Uint8Array>({
  async start(controller) {
    const actions: Action[] = [
      { type: "type", content: "e" },
      { type: "type", content: "ch" },
      { type: "type", content: "o" },
      { type: "type", content: " Hel" },
      { type: "type", content: "lo World" },
      { type: "delete", amount: 5 },
      { type: "type", content: "TypeScript" },
      { type: "type", content: "\n" }, // Enter key
    ]
  
    for (const action of actions) {
      switch (action.type) {
      case "type":
        const keypress = simulateKeypress(action.content)
        controller.enqueue(keypress)
        await delay(200)
        break
      case "delete":
        for (let i = 0; i < action.amount; i++) {
          controller.enqueue(simulateKeypress("backspace"))
          await delay(200)
        }
        break
      }
    }

    controller.close()
  }
})

// Spawn shell process
const shellCommand= getShellCommand()
const shell: ChildProcess = spawn(shellCommand, [], { stdio: ["pipe", "pipe", "pipe"] })

// Pipe simulated keypress stream to shell stdin
keypressStream.pipeTo(new WritableStream({
  write(chunk) {
    shell.stdin!.write(chunk)
    process.stdout.write(chunk) // Echo input to stdout
  },
  close() {
    shell.stdin!.end()
  }
}))

shell.stdout!.pipe(process.stdout)
shell.stderr!.pipe(process.stderr)

// Handle shell process exit
shell.on("exit", (code) => {
  console.log(`Shell process \`${shellCommand}\` exited with code ${code}`)
  process.exit(code ?? 0)
})

// Handle Ctrl+C to terminate the process
process.on("SIGINT", () => {
  shell.kill("SIGINT")
  process.exit()
})