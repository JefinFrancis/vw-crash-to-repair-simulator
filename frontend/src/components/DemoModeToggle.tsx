/**
 * Demo Mode Toggle Button
 * 
 * A button to toggle presentation/demo mode on any page.
 * Can be placed in navigation or as a floating button.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Presentation, MonitorPlay } from 'lucide-react'
import { useDemoMode } from '../hooks/useDemoMode'

interface DemoModeToggleProps {
  variant?: 'button' | 'floating' | 'nav'
  className?: string
}

export function DemoModeToggle({ variant = 'button', className = '' }: DemoModeToggleProps) {
  const { isEnabled, toggleDemoMode } = useDemoMode()

  if (variant === 'floating') {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleDemoMode}
        className={`fixed bottom-6 right-6 z-40 p-4 bg-vw-blue text-white rounded-full shadow-lg hover:bg-vw-dark-blue transition-colors ${className}`}
        title={isEnabled ? 'Exit Demo Mode' : 'Presentation Mode'}
      >
        <Presentation className="w-6 h-6" />
      </motion.button>
    )
  }

  if (variant === 'nav') {
    return (
      <button
        onClick={toggleDemoMode}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isEnabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${className}`}
      >
        <MonitorPlay className="w-4 h-4" />
        {isEnabled ? 'Demo Ativo' : 'Modo Demo'}
      </button>
    )
  }

  // Default button variant
  return (
    <button
      onClick={toggleDemoMode}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg ${className}`}
    >
      <Presentation className="w-5 h-5" />
      {isEnabled ? 'Exit Demo Mode' : 'Start Presentation'}
    </button>
  )
}

export default DemoModeToggle
