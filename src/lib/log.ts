import { homedir } from "os"
import { resolve, sep } from "path"
import { mkdir, appendFile } from "fs/promises"
import type { CoreMessage } from "ai"
import { parseJsonl } from "./jsonl"
import type { AppConfig } from "@/views/state"
import { readFileSync, writeFileSync } from "fs"

// date-time file compatible
export let SESSION_ID = new Date().getTime().toString()

export const setSessionId = (id: string) => {
  SESSION_ID = id

  log("Session ID set to", id)
} 

export enum LOGFILE {
  DEBUG = "debug.txt",
  TRANSCRIPT = "transcript.txt",
}

export const getConfigDir = () => resolve(homedir(), ".config", "claude_terminal")
export const getConfigPath = () => resolve(getConfigDir(), "config.json")
export const getSessionsDir = () => resolve(getConfigDir(), "sessions")

export const getCurrentDebugPath = () => resolve(getCurrentSessionDir(), LOGFILE.DEBUG)
export const getCurrentSessionDir = () => resolve(getSessionsDir(), SESSION_ID)

const getCurrentTranscriptPath = () => resolve(getCurrentSessionDir(), LOGFILE.TRANSCRIPT)
const getCurrentMessagesPath = () => resolve(getCurrentSessionDir(), "messages.jsonl")

export const getConfig = (): AppConfig => {
  const configPath = getConfigPath()
  try {
    const text = readFileSync(configPath, "utf-8")
    const config = JSON.parse(text)
    log("Loaded config", config)
    return config
  } catch (error) {
    log("Error loading config file")
    return {}
  }
}

export const setConfig = async (config: AppConfig) => {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

/**
 * @returns The directory of the most recent session.
 */
export const getLastSessionDirectory = async () => {
  const glob = new Bun.Glob("./*")
  const scanner = glob.scan({ cwd: getSessionsDir(), absolute: true, onlyFiles: false })
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

export const getCurrentConversation = async (): Promise<Conversation> => {
  await ensureLogsExist()

  const path = getCurrentMessagesPath()
  const timestamp = Number(path.split(sep).at(-2))
  const messages = await parseJsonl(path) ?? []

  return {
    path,
    timestamp,
    messages
  }
}

export const getNewConversation = async (): Promise<Conversation> => {
  // New session ID.
  setSessionId(new Date().getTime().toString())
  return await getCurrentConversation()
}

export const loadThreadsFromDisk = async () => {
  const glob = new Bun.Glob("./*/messages.jsonl")
  const scanner = glob.scan({ cwd: getSessionsDir(), absolute: true, onlyFiles: true })
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
  const CONFIG_FILE = Bun.file(getConfigPath())
  const DEBUG_FILE = Bun.file(getCurrentDebugPath())
  const TRANSCRIPT_FILE = Bun.file(getCurrentTranscriptPath())
  const MESSAGES_FILE = Bun.file(getCurrentMessagesPath())

  await mkdir(getCurrentSessionDir(), { recursive: true })

  for (const file of [CONFIG_FILE, DEBUG_FILE, TRANSCRIPT_FILE, MESSAGES_FILE]) {
    const exists = await file.exists()
    if (!exists) {
      await Bun.write(file, "")
      // await Bun.write(file, `Created file at ${new Date().toISOString()}\n\n`)
    }
  }
}

export const log = async (...messages: unknown[]) => {
  await ensureLogsExist()
  await appendFile(getCurrentDebugPath(), `${new Date().toISOString()}\n${messages.map((msg) => JSON.stringify(msg, null, 2)).join("\n")}\n\n`)
}

export const writeMessagesToDisk = async (...messages: CoreMessage[]) => {
  await ensureLogsExist()
  for (const message of messages) {
    await appendFile(getCurrentMessagesPath(), JSON.stringify(message) + "\n")
  }
}

export const writeMessagesToTranscript = async (...messages: CoreMessage[]) => {
  await ensureLogsExist()
  for (const message of messages) {
    if (typeof message.content === "string") {
      await appendFile(getCurrentTranscriptPath(), `[${message.role}]\n${new Date().toISOString()}\n${message.content}\n\n`)
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        switch (content.type) {
        case "text":
          await appendFile(getCurrentTranscriptPath(), `[${message.role}]\n${new Date().toISOString()}\n${content.text}\n\n`)
          break
        
        default:
          await appendFile(getCurrentTranscriptPath(), `[${message.role}]\n${new Date().toISOString()}\n${JSON.stringify(content, null, 2)}\n\n`)
          break
        }
      }
    }
  }
}