import { getConfig, loadThreadsFromDisk, setConfig, type Conversation } from "@/lib/log"
import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react"

export interface AppConfig {
  apiKey?: string;
}

export interface AppState {
  config: AppConfig;
  selectedThread: Conversation | null;
  threads: Conversation[];
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

  /**
   * Load conversations from disk on mount.
   */
  useLayoutEffect(() => {
    loadThreadsFromDisk().then((threads) => {
      setState(prevState => ({ ...prevState, threads }))
    })
  }, [])

  const update = (newState: Partial<AppState>) => {
    setState(prevState => ({ ...prevState, ...newState }))
  }

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