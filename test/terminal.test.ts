import { expect, test } from "bun:test"
import { spawn } from "child_process"
import os from "os"

test("terminal", async () => {
  const stdoutBuffer: number[] = []
  const stderrBuffer: number[] = []

  expect(async () => {
    const executable = os.platform() === "win32" ? "./dist/bin.exe" : "./dist/bin"
    console.log({ executable })
    const subprocess = spawn(
      executable,
      [],
      {
        stdio: [process.stdin, "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "1" },
      },
    )

    subprocess.stdout.on("data", (chunk: Buffer) => stdoutBuffer.push(...chunk))
    subprocess.stderr.on("data", (chunk: Buffer) => stderrBuffer.push(...chunk))

    try {
      subprocess.send("STOP_CLAUDE_SERVER")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      subprocess.kill("SIGINT")
    } catch (e) {}
  }).not.toThrow()

  if (os.platform() !== "darwin") {
    expect(stdoutBuffer).toMatchSnapshot(os.version())
    expect(stderrBuffer).toMatchSnapshot(os.version())
  }

  process.stdout.write("STDOUT:\n")
  process.stdout.write(Buffer.from(stdoutBuffer).toString())
})