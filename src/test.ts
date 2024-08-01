import { spawn } from "child_process"

const ENCODER = new TextEncoder()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Simulate a keypress
function simulateKeypress(key: string): Uint8Array {
  switch (key) {
  case "\n":
    return new Uint8Array([13, 10]) // Carriage return + Line feed

  case "backspace":
    return new Uint8Array([8, 32, 8])
  }

  return ENCODER.encode(key)
}

// Create a stream of simulated keypresses with delays
const keypressStream = new ReadableStream<Uint8Array>({
  async start(controller) {
    const actions = [
      { type: "type", content: "echo Hello world" },
      { type: "delete", amount: 5 },
      { type: "type", content: "TypeScript" },
      { type: "type", content: "\n" }, // Enter key
    ]
  
    for (const action of actions) {
      switch (action.type) {
      case "type":
        for (const char of action.content) {
          controller.enqueue(simulateKeypress(char))
          await delay(200)
        }
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


// Spawn bash process
const bash = spawn("bash", [], { stdio: ["pipe","pipe", "pipe"] })

// Pipe simulated keypress stream to bash stdin
keypressStream.pipeTo(new WritableStream({
  write(chunk) {
    bash.stdin.write(chunk)
    Bun.write(Bun.stdin, chunk)
  },
  close() {
    bash.stdin.end()
  }
}))

bash.stdout.pipe(process.stdout)

// Handle bash process exit
bash.on("exit", (code) => {
  console.log(`Bash process exited with code ${code}`)
  process.exit(code)
})

// Handle Ctrl+C to terminate the process
process.on("SIGINT", () => {
  bash.kill("SIGINT")
  process.exit()
})