/**
 * Demo Mode Context and Provider
 * 
 * Provides presentation/kiosk mode for VW Brand Day demos with:
 * - Large fonts and UI scaling
 * - Auto-progression through demo flow
 * - Narrative text for each step
 * - Touch-friendly controls
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface DemoStep {
  id: string
  title: string
  subtitle: string
  narrative: string
  path: string
  duration: number // seconds
  autoProgress: boolean
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'landing',
    title: 'VW Crash-to-Repair',
    subtitle: 'Collision Simulator',
    narrative: 'Welcome to the Volkswagen collision simulator. Here you can experience how our vehicle diagnostic and repair system works.',
    path: '/',
    duration: 8,
    autoProgress: true
  },
  {
    id: 'simulation',
    title: 'Collision Simulation',
    subtitle: 'Select vehicle and scenario',
    narrative: 'Choose a VW vehicle model and configure the type of collision you want to simulate using our BeamNG.drive simulator.',
    path: '/simulation',
    duration: 15,
    autoProgress: false
  },
  {
    id: 'results',
    title: 'Damage Analysis',
    subtitle: 'Detailed diagnosis',
    narrative: 'See the complete analysis of damage caused by the collision, including affected components and repair estimate.',
    path: '/results',
    duration: 12,
    autoProgress: false
  },
  {
    id: 'dealers',
    title: 'Dealer Network',
    subtitle: 'Find the nearest one',
    narrative: 'Our network of authorized dealerships is ready to serve you. Choose the most convenient one for your repair.',
    path: '/dealers',
    duration: 10,
    autoProgress: false
  },
  {
    id: 'appointment',
    title: 'Scheduling',
    subtitle: 'Reserve your time slot',
    narrative: 'Schedule the repair service directly with your chosen dealership. Choose the most convenient date and time.',
    path: '/appointment',
    duration: 15,
    autoProgress: false
  }
]

interface DemoModeContextType {
  isEnabled: boolean
  currentStep: DemoStep | null
  stepIndex: number
  isAutoPlaying: boolean
  scale: number
  enableDemoMode: () => void
  disableDemoMode: () => void
  toggleDemoMode: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  toggleAutoPlay: () => void
  setScale: (scale: number) => void
  steps: DemoStep[]
}

const DemoModeContext = createContext<DemoModeContextType | null>(null)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [scale, setScale] = useState(1.2) // 120% default scale for presentations

  const currentStep = DEMO_STEPS[stepIndex] || null

  const enableDemoMode = useCallback(() => {
    setIsEnabled(true)
    setStepIndex(0)
    // Apply body class for global styling
    document.body.classList.add('demo-mode')
  }, [])

  const disableDemoMode = useCallback(() => {
    setIsEnabled(false)
    setIsAutoPlaying(false)
    document.body.classList.remove('demo-mode')
  }, [])

  const toggleDemoMode = useCallback(() => {
    if (isEnabled) {
      disableDemoMode()
    } else {
      enableDemoMode()
    }
  }, [isEnabled, enableDemoMode, disableDemoMode])

  const nextStep = useCallback(() => {
    setStepIndex(prev => Math.min(prev + 1, DEMO_STEPS.length - 1))
  }, [])

  const prevStep = useCallback(() => {
    setStepIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < DEMO_STEPS.length) {
      setStepIndex(index)
    }
  }, [])

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying(prev => !prev)
  }, [])

  // Auto-progress timer
  useEffect(() => {
    if (!isEnabled || !isAutoPlaying || !currentStep) return

    const timer = setTimeout(() => {
      if (stepIndex < DEMO_STEPS.length - 1 && currentStep.autoProgress) {
        nextStep()
      } else {
        setIsAutoPlaying(false)
      }
    }, currentStep.duration * 1000)

    return () => clearTimeout(timer)
  }, [isEnabled, isAutoPlaying, stepIndex, currentStep, nextStep])

  // Keyboard shortcuts for demo control
  useEffect(() => {
    if (!isEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevStep()
          break
        case 'Escape':
          e.preventDefault()
          disableDemoMode()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          toggleAutoPlay()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEnabled, nextStep, prevStep, disableDemoMode, toggleAutoPlay])

  const value: DemoModeContextType = {
    isEnabled,
    currentStep,
    stepIndex,
    isAutoPlaying,
    scale,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
    nextStep,
    prevStep,
    goToStep,
    toggleAutoPlay,
    setScale,
    steps: DEMO_STEPS
  }

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode(): DemoModeContextType {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}

export { DEMO_STEPS }
export type { DemoStep }
