import { homedir } from "os"
import { basename, resolve, sep } from "path"
import { mkdir, appendFile } from "fs/promises"
import type { CoreMessage, CoreTool } from "ai"
import { parseJsonl } from "./jsonl"
import type { AppConfig } from "@/lib/state"
import { readFileSync, writeFileSync } from "fs"

// date-time file compatible
export let SESSION_ID = new Date().getTime().toString()

export const setSessionId = (id: string) => {
  SESSION_ID = id

  log("Session ID set to", id)
} 

export enum PATHS {
  CONFIG = "config.json",
  DEBUG = "debug.txt",
  TRANSCRIPT = "transcript.txt",
  MESSAGES = "messages.jsonl",
  TOOLS = "tools.ts",
  EXAMPLES = "examples/"
}

export const getConfigDir = () => resolve(homedir(), ".config", "ttychat")
export const getSessionsDir = () => resolve(getConfigDir(), "sessions")
export const getConfigPath = () => resolve(getConfigDir(), PATHS.CONFIG)
export const getToolsPath = () => resolve(getConfigDir(), PATHS.TOOLS)
export const getExamplesPath = () => resolve(getConfigDir(), PATHS.EXAMPLES)

export const getCurrentSessionDir = () => resolve(getSessionsDir(), SESSION_ID)
export const getCurrentDebugPath = () => resolve(getCurrentSessionDir(), PATHS.DEBUG)
export const getCurrentTranscriptPath = () => resolve(getCurrentSessionDir(), PATHS.TRANSCRIPT)
export const getCurrentMessagesPath = () => resolve(getCurrentSessionDir(), PATHS.MESSAGES)

export const getConfig = (): AppConfig => {
  const configPath = getConfigPath()
  try {
    const text = readFileSync(configPath, "utf-8")
    const config = JSON.parse(text)
    log("Loaded config", config)
    return config
  } catch (error) {
    log("Error loading config file")
    return {
      model: "Claude Sonnet 3.5"
    }
  }
}

export const writeConfigToDisk = async (config: AppConfig) => {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export const loadToolsFromDisk = async () => {
  const toolsPath = getToolsPath()
  await log("Loading tools file", toolsPath)
  try {
    const { default: tools } = await import(toolsPath)
    await log("Loaded tools file", tools)
    return tools as Record<string, CoreTool>
  } catch (e) {
    await log("`tools.ts` config file does not exist - no custom tools")
    return {}
  }
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

export const loadExamplesFromDisk = async (): Promise<Record<string, CoreMessage[]> | null> => {
  await ensureConfigDir()

  const glob = new Bun.Glob("./examples/*.jsonl")
  const scanner = glob.scan({ cwd: getConfigDir(), absolute: true, onlyFiles: true })

  const paths = await Array.fromAsync(scanner) as string[]
  const examples: Record<string, CoreMessage[]> = {}

  if (!paths.length) {
    return null
  }

  for (const path of paths) {
    const name = basename(path).replace(".jsonl", "")
    const messages = await parseJsonl(path)
    if (messages === null) {
      continue
    }

    examples[name] = messages
  }

  return examples
}

// console.log(await getExamplesFromDisk())

export const getExamplesAsSystemMessage = async () => {
  const examples = await loadExamplesFromDisk()
  if (!examples) {
    return ""
  }

  let system = "--- TRAINING EXAMPLES FOLLOW. THESE ARE *PAST* CONVERSATIONS WITH A *DIFFERENT* USER ON A *DIFFERENT* MACHINE. ---\n\n"
  
  for (const [name, messages] of Object.entries(examples)) {
    const tag = `TRAINING EXAMPLE ${name}`
    system += `<${tag}>\n\n`
    
    for (const message of messages) {
      system += `[${message.role.toUpperCase()}]\n`
      if (typeof message.content === "string") {
        // section.push({ role: "user", content: message.content })
        system += `${message.content}\n`
      } else if (Array.isArray(message.content)) {
        for (const content of message.content) {
          switch (content.type) {
          case "text":
            // section.push({ role: "user", content: content.text })
            system += `${content.text.trim()}\n`
            break

          case "tool-call":
            system += "TOOL-CALL:\n"
            system += `${content.toolName}\n`
            break

          case "tool-result":
            system += "TOOL-RESULT:\n"
            system += `${JSON.stringify(content.result, null, 2).slice(0, 24)} ...\n`
            break
          
          default:
            // section.push({ role: "user", content: JSON.stringify(content, null, 2) })
            // system += `${JSON.stringify(content, null, 2)}\n`
            break
          }
        }
      }

      system += "\n"
    }

    system += `</${tag}>\n\n`

  }

  system += "--- END OF TRAINING EXAMPLES. CURRENT CONVERSATION FOLLOWS. ---"

  return system
}

export interface Thread {
  path: string
  timestamp: number
  messages: CoreMessage[]
}

export const getCurrentThread = async (): Promise<Thread> => {
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

export const getNewThread = async (): Promise<Thread> => {
  // New session ID.
  setSessionId(new Date().getTime().toString())
  return await getCurrentThread()
}

export const loadThreadsFromDisk = async () => {
  const glob = new Bun.Glob("./*/messages.jsonl")
  const scanner = glob.scan({ cwd: getSessionsDir(), absolute: true, onlyFiles: true })
  const paths = await Array.fromAsync(scanner)

  const conversations: Thread[] = []
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

export const getLastLog = async (type: PATHS) => {
  const lastSessionDirectory = await getLastSessionDirectory()
  const lastLogPath = resolve(lastSessionDirectory, type)
  
  const logFile = Bun.file(lastLogPath)
  return await new Response(logFile.stream()).text()
}

export const ensureConfigDir = async () => {
  const CONFIG_DIR = getConfigDir()
  await mkdir(CONFIG_DIR, { recursive: true })
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