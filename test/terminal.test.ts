import { getLastLog, PATHS } from "@/lib/log"
import { expect, test } from "bun:test"
import { spawn } from "child_process"
import os from "os"

test.skip("terminal", async () => {
  const stdoutBuffer: number[] = []
  const stderrBuffer: number[] = []

  expect(async () => {
    const executable = os.platform() === "win32" ? "./dist/bin.exe" : "./dist/bin"
    console.log({ executable })

    const subprocess = spawn(
      executable,
      [],
      {
        stdio: [process.stdin, "pipe", "pipe", "ipc"],
        env: { ...process.env, FORCE_COLOR: "1" },
      },
    )

    subprocess.stdout?.on("data", (chunk: Buffer) => stdoutBuffer.push(...chunk))
    subprocess.stderr?.on("data", (chunk: Buffer) => stderrBuffer.push(...chunk))

    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      subprocess.send("STOP_CLAUDE_SERVER")
      await new Promise((resolve) => setTimeout(resolve, 500))
      subprocess.kill("SIGINT")
    } catch (e) {}
  }).not.toThrow()

  expect(stdoutBuffer, "stdout did not match").toMatchSnapshot(os.version())
  expect(stderrBuffer, "stderr did not match").toMatchSnapshot(os.version())

  process.stdout.write("STDOUT:\n")
  process.stdout.write(Buffer.from(stdoutBuffer).toString())

  const lastDebugLog = await getLastLog(PATHS.DEBUG)
  console.log(lastDebugLog)

  expect(lastDebugLog, "should receive ipc stop message").toContain("STOP_CLAUDE_SERVER")
  expect(lastDebugLog, "should stop server").toContain("Server stopped")
})