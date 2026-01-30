import { useEffect } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { beamngService } from '../services/beamngService'
import toast from 'react-hot-toast'

export function ConnectionStatus() {
  const { beamng, setBeamNGConnection, updateBeamNGStatus } = useAppStore()
  
  useEffect(() => {
    // Check BeamNG connection status on mount
    checkBeamNGConnection()
    
    // Set up periodic health checks
    const interval = setInterval(checkBeamNGConnection, 10000) // Every 10 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  const checkBeamNGConnection = async () => {
    try {
      const response = await beamngService.getHealth()
      setBeamNGConnection({
        ...beamng,
        connected: response.connected || false,
        status: response.connected ? 'connected' : 'disconnected',
      })
    } catch (error) {
      updateBeamNGStatus('disconnected')
    }
  }
  
  const handleReconnect = async () => {
    try {
      updateBeamNGStatus('connecting')
      toast.loading('Conectando ao BeamNG...', { id: 'beamng-connect' })
      
      const response = await beamngService.connect({
        host: beamng.host,
        port: beamng.port,
        timeout: 30
      })
      
      if (response.data) {
        setBeamNGConnection(response.data)
      }
      toast.success('Connected to BeamNG successfully!', { id: 'beamng-connect' })
    } catch (error) {
      updateBeamNGStatus('error')
      toast.error('Failed to connect to BeamNG', { id: 'beamng-connect' })
    }
  }
  
  const getStatusColor = () => {
    switch (beamng.status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }
  
  const getStatusText = () => {
    switch (beamng.status) {
      case 'connected':
        return 'BeamNG Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      default:
        return 'BeamNG Disconnected'
    }
  }
  
  const getStatusIcon = () => {
    switch (beamng.status) {
      case 'connected':
        return <Wifi className="h-4 w-4" />
      case 'connecting':
        return <Wifi className="h-4 w-4 animate-pulse" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <WifiOff className="h-4 w-4" />
    }
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3 min-w-[200px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">
                {getStatusText()}
              </span>
            </div>
          </div>
          
          {(beamng.status === 'disconnected' || beamng.status === 'error') && (
            <button
              onClick={handleReconnect}
              className="vw-button-primary text-xs py-1 px-2"
            >
              Conectar
            </button>
          )}
          
          {beamng.status === 'connecting' && (
            <button
              className="vw-button-primary text-xs py-1 px-2 opacity-50 cursor-not-allowed"
              disabled
            >
              Conectando...
            </button>
          )}
        </div>
        
        {beamng.connected && beamng.last_heartbeat && (
          <div className="mt-2 text-xs text-gray-500">
            Last connection: {new Date(beamng.last_heartbeat).toLocaleTimeString('en-US')}
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          {beamng.host}:{beamng.port}
        </div>
      </div>
    </div>
  )
}