import { expect, test, describe } from "bun:test"
import { StringConsole } from "./stringConsole" // Adjust the import path as needed
import chalk from "chalk"

const hasColorCodes = (str: string) => /\u001b\[\d+m/.test(str)

describe("StringConsole", () => {
  describe("with colors enabled", () => {
    const colorConsole = new StringConsole({ colorMode: true })

    test("captures console.log output with colors", () => {
      const output = colorConsole.log(chalk.dim("Hello, world!"))
      expect(hasColorCodes(output)).toBe(true)
      expect(output).toContain("Hello, world!")
    })

    test("captures console.warn output with colors", () => {
      const output = colorConsole.warn(chalk.dim("This is a warning"))
      expect(hasColorCodes(output)).toBe(true)
      expect(output).toContain("This is a warning")
    })

    test("captures console.error output with colors", () => {
      const output = colorConsole.error(chalk.dim("An error occurred"))
      expect(hasColorCodes(output)).toBe(true)
      expect(output).toContain("An error occurred")
    })

    test("captures console.table output with colors", () => {
      const testData = {
        name: "John Doe",
        age: 42,
        city: "Nowhere"
      }
      const output = colorConsole.table(testData)
      expect(hasColorCodes(output)).toBe(true)
      expect(output).toContain("John Doe")
      expect(output).toContain("42")
      expect(output).toContain("Nowhere")
    })

    test("captures multiple arguments in console.log with colors and proper spacing", () => {
      const output = colorConsole.log("Hello", 123, { key: "value" })
      expect(hasColorCodes(output)).toBe(true)
      expect(output).toMatchSnapshot()
    })
  })

  describe("with colors disabled", () => {
    const noColorConsole = new StringConsole({ colorMode: false })

    test("captures console.log output without colors", () => {
      const output = noColorConsole.log("Hello, world!")
      expect(hasColorCodes(output)).toBe(false)
      expect(output).toBe("Hello, world!")
    })

    test("captures console.warn output without colors", () => {
      const output = noColorConsole.warn("This is a warning")
      expect(hasColorCodes(output)).toBe(false)
      expect(output).toBe("This is a warning")
    })

    test("captures console.error output without colors", () => {
      const output = noColorConsole.error("An error occurred")
      expect(hasColorCodes(output)).toBe(false)
      expect(output).toBe("An error occurred")
    })

    test("captures console.table output without colors", () => {
      const testData = {
        name: "John Doe",
        age: 42,
        city: "Nowhere"
      }
      const output = noColorConsole.table(testData)
      expect(hasColorCodes(output)).toBe(false)
      expect(output).toContain("John Doe")
      expect(output).toContain("42")
      expect(output).toContain("Nowhere")
    })

    test("captures multiple arguments in console.log without colors and with proper spacing", () => {
      const output = noColorConsole.log("Hello", 123, { key: "value" })
      expect(hasColorCodes(output)).toBe(false)
      expect(output).toBe("Hello 123 { key: 'value' }")
    })
  })

  test("can be used as a drop-in replacement for Console", () => {
    const stringConsole = new StringConsole()
    expect(() => {
      stringConsole.log("Test")
      stringConsole.warn("Warning")
      stringConsole.error("Error")
      stringConsole.info("Info")
      stringConsole.debug("Debug")
      stringConsole.table({ a: 1, b: 2 })
    }).not.toThrow()
  })
})