import { homedir } from "os"
import { resolve } from "path"
import { mkdir, appendFile } from "fs/promises"
import type { CoreMessage } from "ai"

// date-time file compatible
const SESSION_ID = 
  new Date()
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(/[/:,\s]/g, "_")

const CONFIG_DIR = resolve(homedir(), ".config", "claude_terminal")
const SESSION_DIR = resolve(CONFIG_DIR, SESSION_ID)

const DEBUG_PATH = resolve(SESSION_DIR, "debug.txt")
const SESSION_LOG_PATH = resolve(SESSION_DIR, "session.txt")

const ensureLogsExist = async () => {
  const DEBUG_FILE = Bun.file(DEBUG_PATH)
  const SESSION_LOG_FILE = Bun.file(SESSION_LOG_PATH)

  await mkdir(SESSION_DIR, { recursive: true })

  for (const file of [DEBUG_FILE, SESSION_LOG_FILE]) {
    const exists = await file.exists()
    if (!exists) {
      await Bun.write(file, "")
      await Bun.write(file, `Created file at ${new Date().toISOString()}\n\n`)
    }
  }
}

export const debug = async (...messages: string[]) => {
  await ensureLogsExist()
  await appendFile(DEBUG_PATH, `${new Date().toISOString()}\n${messages.join("\n")}\n\n`)
}

export const sessionLog = async (...messages: CoreMessage[]) => {
  await ensureLogsExist()
  for (const message of messages) {
    if (typeof message.content === "string") {
      await appendFile(SESSION_LOG_PATH, `[${message.role}]\n${new Date().toISOString()}\n${message.content}\n\n`)
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        switch (content.type) {
        case "text":
          await appendFile(SESSION_LOG_PATH, `[${message.role}]\n${new Date().toISOString()}\n${content.text}\n\n`)
          break
        
        default:
          await appendFile(SESSION_LOG_PATH, `[${message.role}]\n${new Date().toISOString()}\n${JSON.stringify(content, null, 2)}\n\n`)
          break
        }
      }
    }
  }
}