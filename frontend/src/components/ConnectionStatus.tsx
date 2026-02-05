import { useEffect, useState } from 'react'
import { Radio, AlertCircle } from 'lucide-react'
import { beamngService, LatestCrashResponse } from '../services/beamngService'

/**
 * Crash Detection Status Component
 * 
 * Shows the status of crash detection via webhook (no active WebSocket connection).
 * Polls the backend for the latest crash data.
 */
export function ConnectionStatus() {
  const [latestCrash, setLatestCrash] = useState<LatestCrashResponse | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Poll for latest crash data
    const checkForCrash = async () => {
      try {
        const response = await beamngService.getLatestCrash()
        setLatestCrash(response)
        setError(null)
      } catch (err) {
        setError('Backend unavailable')
      }
    }
    
    checkForCrash()
    const interval = setInterval(checkForCrash, 3000) // Every 3 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  const getStatusColor = () => {
    if (error) return 'bg-red-500'
    if (latestCrash?.has_crash) return 'bg-green-500 animate-pulse'
    return 'bg-gray-400'
  }
  
  const getStatusText = () => {
    if (error) return 'Backend indisponível'
    if (latestCrash?.has_crash) return 'Colisão Detectada'
    return 'Aguardando colisão...'
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3 min-w-[200px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <div className="flex items-center space-x-2">
              {error ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Radio className={`h-4 w-4 ${latestCrash?.has_crash ? 'text-green-500' : 'text-gray-400'}`} />
              )}
              <span className="text-sm font-medium text-gray-700">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        
        {latestCrash?.has_crash && (
          <div className="mt-2 text-xs text-gray-500">
            <div>Dano: {latestCrash.total_damage?.toFixed(1) ?? 0}%</div>
            <div>Peças: {latestCrash.broken_parts_count ?? 0} danificadas</div>
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-400">
          Modo webhook • Atualização automática
        </div>
      </div>
    </div>
  )
}