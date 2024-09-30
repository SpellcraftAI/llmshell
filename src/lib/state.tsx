import type { CoreTool } from "ai"
import { getConfig, loadThreadsFromDisk, loadToolsFromDisk, log, writeConfigToDisk, type Thread } from "@/lib/log"
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react"

export type SupportedModel = "GPT-4o" | "Claude Sonnet 3.5"

/**
 * The app config is synced to a JSON file on disk in ~/.config whenever it
 * changes.
 */
export interface AppConfig {
  licenseKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  model: SupportedModel;
}

export interface AppState {
  config: AppConfig;
  selectedThread: Thread | null;
  threads: Thread[];
  customTools?: Record<string, CoreTool>;
  needsApiKey: boolean;
}

interface AppStateContextType {
  state: AppState;
  update: (newState: Partial<AppState>) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

const hasAPIKey = (config: AppConfig): boolean => {
  switch (config.model) {
  case "GPT-4o":
    return Boolean(config.openaiApiKey)
  case "Claude Sonnet 3.5":
    return Boolean(config.anthropicApiKey)
  default:
    throw new Error(`Unknown model: ${config.model}`)
  }
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = getConfig()
  const [state, setState] = useState<AppState>({
    config,
    selectedThread: null,
    threads: [],
    needsApiKey: !hasAPIKey(config)
  })

  const update = useCallback((newState: Partial<AppState>) => {
    setState(prevState => ({ ...prevState, ...newState }))
  }, [])

  /**
   * Load conversations and tools from disk on mount.
   */
  useLayoutEffect(() => {
    Promise.all([loadThreadsFromDisk(), loadToolsFromDisk()]).then(([threads, customTools]) => {
      update({ threads, customTools })
      log("Loaded custom tools", customTools)
    })
  }, [update])

  /**
   * Sync app config to disk whenever it changes.
   */
  useEffect(
    () => {
      writeConfigToDisk(state.config)
    }, 
    [state.config]
  )

  useEffect(() => {
    update({ needsApiKey: !hasAPIKey(state.config) })
  }, [state.config, state.config.openaiApiKey, update])

  return (
    <AppStateContext.Provider value={{ state, update }}>
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider")
  }
  return context
}