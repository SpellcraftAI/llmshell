/**
 * This has to be done outside of bun:test, because it shims process.stdin and
 * other stuff that prevents us from testing the executable in CI.
 */

// import { getLastLog, LOGFILE } from "@/lib/log"
import { spawn } from "child_process"
import { ReadStream } from "tty"
import os from "os"

class MockedStdin extends ReadStream {
  constructor() {
    super(0, { readable: true, writable: true, allowHalfOpen: true, fd: 0 })
  }

  write(data: Uint8Array) {
    this.emit("data", data)
    return true
  }
}

const stdin = new MockedStdin()
const stdoutBuffer: number[] = []
const stderrBuffer: number[] = []

const executable = os.platform() === "win32" ? "./dist/bin.exe" : "./dist/bin"
console.log({ executable })

const subprocess = spawn(
  executable,
  [],
  {
    stdio: [stdin, "pipe", "pipe", "ipc"],
    env: { ...process.env, FORCE_COLOR: "1" },
  }
)

subprocess.stdout?.on("data", (chunk) => stdoutBuffer.push(...chunk))
subprocess.stderr?.on("data", (chunk) => stderrBuffer.push(...chunk))

await new Promise((resolve) => setTimeout(resolve, 1000))
// stdin.write(new TextEncoder().encode("hello world\n\n\n"))
// await new Promise((resolve) => setTimeout(resolve, 3000))

try {
  console.log("Sending STOP_CLAUDE_SERVER message")
  subprocess.send("STOP_CLAUDE_SERVER")
  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log("Sending SIGINT")
  subprocess.kill("SIGINT")
} catch (e) {
  console.error("Error occurred:", e)
}

console.log("STDOUT:")
console.log(Buffer.from(stdoutBuffer).toString())

if (stdoutBuffer.length < 100) {
  throw new Error("Expected stdout")
}

console.log("STDERR:")
console.log(Buffer.from(stderrBuffer).toString())

// const lastDebugLog = await getLastLog(LOGFILE.DEBUG)
// console.log("Last Debug Log:")
// console.log(lastDebugLog)

// // Simple assertions
// if (!lastDebugLog.includes("STOP_CLAUDE_SERVER")) {
//   throw new Error("Expected 'STOP_CLAUDE_SERVER' in debug log")
// }

// if (!lastDebugLog.includes("Server stopped")) {
//   throw new Error("Expected 'Server stopped' in debug log")
// }

console.log("Test completed successfully!")
process.exit(0)