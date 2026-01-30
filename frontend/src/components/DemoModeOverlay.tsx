/**
 * Demo Mode Overlay
 * 
 * Presentation overlay for VW Brand Day demos with:
 * - Narrative text display
 * - Step indicators
 * - Control buttons (next/prev/auto-play)
 * - Progress bar
 * - Touch-friendly controls
 */

import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Presentation,
  Volume2,
  VolumeX,
  Maximize2,
  Monitor
} from 'lucide-react'
import { useDemoMode, DemoStep } from '../hooks/useDemoMode'

export function DemoModeOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isEnabled,
    currentStep,
    stepIndex,
    isAutoPlaying,
    scale,
    disableDemoMode,
    nextStep,
    prevStep,
    goToStep,
    toggleAutoPlay,
    setScale,
    steps
  } = useDemoMode()

  const [showControls, setShowControls] = useState(true)
  const [narrativeVisible, setNarrativeVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Navigate when step changes
  useEffect(() => {
    if (isEnabled && currentStep && location.pathname !== currentStep.path) {
      navigate(currentStep.path)
    }
  }, [isEnabled, currentStep, location.pathname, navigate])

  // Timer for current step
  useEffect(() => {
    if (!isEnabled || !currentStep || !isAutoPlaying) {
      setTimeRemaining(0)
      return
    }

    setTimeRemaining(currentStep.duration)
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isEnabled, currentStep, isAutoPlaying, stepIndex])

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!isEnabled) return

    let hideTimeout: ReturnType<typeof setTimeout>

    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => {
        if (isAutoPlaying) {
          setShowControls(false)
        }
      }, 5000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(hideTimeout)
    }
  }, [isEnabled, isAutoPlaying])

  if (!isEnabled) return null

  const progress = ((stepIndex + 1) / steps.length) * 100

  return (
    <AnimatePresence>
      {/* Demo Mode Container */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ fontSize: `${scale * 100}%` }}
      >
        {/* Top Narrative Bar */}
        <AnimatePresence>
          {narrativeVisible && currentStep && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-vw-blue via-vw-dark-blue to-vw-blue text-white">
                {/* Progress bar */}
                <div className="h-1 bg-white/20">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                
                <div className="container mx-auto px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Presentation className="w-6 h-6" />
                        <span className="text-sm font-medium opacity-80">PRESENTATION MODE</span>
                      </div>
                      <div className="h-6 w-px bg-white/30" />
                      <div>
                        <h2 className="text-xl font-bold">{currentStep.title}</h2>
                        <p className="text-sm opacity-80">{currentStep.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm opacity-80">
                        Passo {stepIndex + 1} de {steps.length}
                      </span>
                      {isAutoPlaying && timeRemaining > 0 && (
                        <span className="text-sm bg-white/20 px-2 py-1 rounded">
                          {timeRemaining}s
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Narrative text */}
                  <motion.p
                    key={currentStep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-lg opacity-90 max-w-3xl"
                  >
                    {currentStep.narrative}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 pointer-events-auto"
            >
              <div className="bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6">
                <div className="container mx-auto px-6">
                  {/* Step indicators */}
                  <div className="flex justify-center gap-2 mb-4">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === stepIndex
                            ? 'bg-white scale-125'
                            : index < stepIndex
                            ? 'bg-white/60'
                            : 'bg-white/30'
                        }`}
                        title={step.title}
                      />
                    ))}
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={prevStep}
                      disabled={stepIndex === 0}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    <button
                      onClick={toggleAutoPlay}
                      className="p-4 bg-white text-vw-blue hover:bg-gray-100 rounded-full transition-all shadow-lg"
                    >
                      {isAutoPlaying ? (
                        <Pause className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8" />
                      )}
                    </button>
                    
                    <button
                      onClick={nextStep}
                      disabled={stepIndex === steps.length - 1}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                  
                  {/* Additional controls */}
                  <div className="flex justify-center gap-4 mt-4">
                    <button
                      onClick={() => setNarrativeVisible(!narrativeVisible)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition-all"
                    >
                      {narrativeVisible ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      {narrativeVisible ? 'Hide Narrative' : 'Show Narrative'}
                    </button>
                    
                    <button
                      onClick={() => setScale(scale === 1.2 ? 1.5 : scale === 1.5 ? 1 : 1.2)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition-all"
                    >
                      <Monitor className="w-4 h-4" />
                      Escala: {Math.round(scale * 100)}%
                    </button>
                    
                    <button
                      onClick={disableDemoMode}
                      className="flex items-center gap-2 px-3 py-1 bg-red-500/80 hover:bg-red-500 rounded text-white text-sm transition-all"
                    >
                      <X className="w-4 h-4" />
                      Sair do Modo Demo
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VW Brand watermark */}
        <div className="absolute bottom-24 right-6 opacity-20 pointer-events-none">
          <img 
            src="/vw-logo.svg" 
            alt="VW" 
            className="w-24 h-24"
            onError={(e) => {
              // Fallback if logo doesn't load
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </div>
    </AnimatePresence>
  )
}

export default DemoModeOverlay
