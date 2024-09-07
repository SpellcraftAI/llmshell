import type { CoreTool } from "ai"
import { getConfig, loadThreadsFromDisk, loadToolsFromDisk, setConfig, type Conversation } from "@/lib/log"
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react"

export interface AppConfig {
  apiKey?: string;
}

export interface AppState {
  config: AppConfig;
  selectedThread: Conversation | null;
  threads: Conversation[];
  customTools?: Record<string, CoreTool>;
}

interface AppStateContextType {
  state: AppState;
  update: (newState: Partial<AppState>) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    config: getConfig(),
    selectedThread: null,
    threads: []
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
    })
  }, [update])

  useEffect(
    () => {
      setConfig(state.config)
    }, 
    [state.config]
  )

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