import React, { createContext, useContext, useState } from "react"

export type Page = "animation" | "threads" | "chat" | "settings" | "info" | "activate";

interface RouterContextType {
  page: Page;
  navigate: (to: Page) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined)

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [page, setPage] = useState<Page>("threads")

  const navigate = (to: Page) => {
    setPage(to)
  }

  return (
    <RouterContext.Provider value={{ page, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export const useRouter = () => {
  const context = useContext(RouterContext)
  if (context === undefined) {
    throw new Error("useRouter must be used within a RouterProvider")
  }
  return context
}