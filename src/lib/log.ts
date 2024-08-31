import { homedir } from "os"
import { resolve, sep } from "path"
import { mkdir, appendFile } from "fs/promises"
import type { CoreMessage } from "ai"
import { parseJsonl } from "./jsonl"

// date-time file compatible
const SESSION_ID = new Date().getTime().toString()

export enum LOGFILE {
  DEBUG = "debug.txt",
  TRANSCRIPT = "transcript.txt",
}

const CONFIG_DIR = resolve(homedir(), ".config", "claude_terminal")
const SESSION_DIR = resolve(CONFIG_DIR, SESSION_ID)

const DEBUG_PATH = resolve(SESSION_DIR, LOGFILE.DEBUG)
const TRANSCRIPT_PATH = resolve(SESSION_DIR, LOGFILE.TRANSCRIPT)
const MESSAGES_PATH = resolve(SESSION_DIR, "messages.jsonl")

/**
 * @returns The directory of the most recent session.
 */
export const getLastSessionDirectory = async () => {
  const glob = new Bun.Glob("./*")
  const scanner = glob.scan({ cwd: CONFIG_DIR, absolute: true, onlyFiles: false })
  const results = await Array.fromAsync(scanner)
  
  const lastDirectory = results.sort().pop()
  if (!lastDirectory) {
    throw new Error("No session directories found")
  }

  return lastDirectory
}

export interface Conversation {
  path: string
  timestamp: number
  messages: CoreMessage[]
}

export const getConversations = async () => {
  const glob = new Bun.Glob("./*/messages.jsonl")
  const scanner = glob.scan({ cwd: CONFIG_DIR, absolute: true, onlyFiles: true })
  const paths = await Array.fromAsync(scanner)

  const conversations: Conversation[] = []
  for (const path of paths) {
    const timestamp = Number(path.split(sep).at(-2))
    const messages = await parseJsonl(path)
    if (messages === null || messages.length === 0) {
      continue
    }

    conversations.push({
      path,
      timestamp,
      messages
    })
  }

  conversations.sort((a, b) => b.timestamp - a.timestamp)
  return conversations
}

export const getLastLog = async (type: LOGFILE) => {
  const lastSessionDirectory = await getLastSessionDirectory()
  const lastLogPath = resolve(lastSessionDirectory, type)
  
  const logFile = Bun.file(lastLogPath)
  return await new Response(logFile.stream()).text()
}

const ensureLogsExist = async () => {
  const DEBUG_FILE = Bun.file(DEBUG_PATH)
  const TRANSCRIPT_FILE = Bun.file(TRANSCRIPT_PATH)
  const MESSAGES_FILE = Bun.file(MESSAGES_PATH)

  await mkdir(SESSION_DIR, { recursive: true })

  for (const file of [DEBUG_FILE, TRANSCRIPT_FILE, MESSAGES_FILE]) {
    const exists = await file.exists()
    if (!exists) {
      await Bun.write(file, "")
      // await Bun.write(file, `Created file at ${new Date().toISOString()}\n\n`)
    }
  }
}

export const log = async (...messages: unknown[]) => {
  await ensureLogsExist()
  await appendFile(DEBUG_PATH, `${new Date().toISOString()}\n${messages.map((msg) => JSON.stringify(msg)).join("\n")}\n\n`)
}

export const addMessage = async (...messages: CoreMessage[]) => {
  await ensureLogsExist()
  for (const message of messages) {
    await appendFile(MESSAGES_PATH, JSON.stringify(message) + "\n")
  }
}

export const sessionLog = async (...messages: CoreMessage[]) => {
  await ensureLogsExist()
  for (const message of messages) {
    if (typeof message.content === "string") {
      await appendFile(TRANSCRIPT_PATH, `[${message.role}]\n${new Date().toISOString()}\n${message.content}\n\n`)
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        switch (content.type) {
        case "text":
          await appendFile(TRANSCRIPT_PATH, `[${message.role}]\n${new Date().toISOString()}\n${content.text}\n\n`)
          break
        
        default:
          await appendFile(TRANSCRIPT_PATH, `[${message.role}]\n${new Date().toISOString()}\n${JSON.stringify(content, null, 2)}\n\n`)
          break
        }
      }
    }
  }
}