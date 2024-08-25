import { Writable } from "node:stream"
import { Console } from "node:console"

export class StringConsole extends Console {
  private output: string[] = []

  constructor({ colorMode = true } = {}) {
    const stream = new Writable({
      write: (chunk, encoding, callback) => {
        this.output.push(chunk.toString())
        callback()
      },
    })

    super({ stdout: stream, stderr: stream, colorMode })
  }

  private captureOutput(method: keyof Console, ...args: any[]): string {
    this.output = []
    // @ts-expect-error will always eist
    super[method](...args)
    return this.output.join(" ").trim()
  }

  log(...args: any[]): string {
    return this.captureOutput("log", ...args)
  }

  warn(...args: any[]): string {
    return this.captureOutput("warn", ...args)
  }

  error(...args: any[]): string {
    return this.captureOutput("error", ...args)
  }

  info(...args: any[]): string {
    return this.captureOutput("info", ...args)
  }

  debug(...args: any[]): string {
    return this.captureOutput("debug", ...args)
  }

  table(tabularData: any, properties?: readonly string[] | undefined): string {
    return this.captureOutput("table", tabularData, properties)
  }

  // Override other Console methods as needed
}