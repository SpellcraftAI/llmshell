import { expect, test } from "bun:test"
import os from "os"

test("terminal", async () => {
  const stdoutBuffer: number[] = []
  const stderrBuffer: number[] = []

  expect(async () => {
    const executable = os.platform() === "win32" ? "./dist/bin.exe" : "./dist/bin"
    console.log({ executable })
    const subprocess = Bun.spawn(
      [executable],
      {
        stdio: [Bun.stdin.stream(), "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "1" },
        ipc(message, subprocess) {
          switch (message) {
          case "STOP_CLAUDE_SERVER":
            subprocess.send(message)
            break
          }
        },
      },
    )

    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 1_000)),
      subprocess.stdout.pipeTo(
        new WritableStream({
          write(chunk) {
            stdoutBuffer.push(...chunk)
          }
        })
      ),
    ])

    try {
      subprocess.send("STOP_CLAUDE_SERVER")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      subprocess.kill("SIGINT")
    } catch (e) {}
  }).not.toThrow()

  // const id = `${os.platform()}-${os.version()}`
  if (os.platform() !== "darwin") {
    expect(stdoutBuffer).toMatchSnapshot(os.version())
    expect(stderrBuffer).toMatchSnapshot(os.version())
  }

  const decoder = new TextDecoder()

  process.stdout.write("STDOUT:\n")
  process.stdout.write(decoder.decode(new Uint8Array(stdoutBuffer)))

  // await Bun.write(Bun.stdout, new Uint8Array(stdoutBuffer))
})