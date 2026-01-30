import React, { createContext, useContext, ReactNode } from 'react'

interface AppContextType {
  // You can add context-specific state here if needed
  // For now, we're using Zustand for state management
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const value: AppContextType = {
    // Context values would go here
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}