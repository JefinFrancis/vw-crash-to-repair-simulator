import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Car, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  RefreshCw,
  Zap,
  Target,
  Gauge
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { beamngService } from '../services/beamngService'
import { vehicleService } from '../services/vehicleService'
import { damageService } from '../services/damageService'
import { Vehicle, BeamNGConnection } from '../types'

// Crash scenario types
const CRASH_SCENARIOS = [
  { id: 'frontal', name: 'Frontal Collision', icon: '🚗💥', speed: 50, angle: 0 },
  { id: 'side', name: 'Side Collision', icon: '🚗⬅️', speed: 40, angle: 90 },
  { id: 'rear', name: 'Rear Collision', icon: '💥🚗', speed: 30, angle: 180 },
  { id: 'rollover', name: 'Capotamento', icon: '🔄🚗', speed: 60, angle: 45 },
]

export function SimulationPage() {
  const navigate = useNavigate()
  const { 
    beamng, 
    selectedVehicle, 
    setSelectedVehicle, 
    setBeamNGConnection,
    updateBeamNGStatus,
    setCurrentDamageAssessment 
  } = useAppStore()
  
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(CRASH_SCENARIOS[0])
  const [customSpeed, setCustomSpeed] = useState(50)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)

  // Fetch available vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 50 }),
  })

  // Check BeamNG health
  const { data: beamngHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['beamng-health'],
    queryFn: () => beamngService.getHealth(),
    refetchInterval: 5000,
  })

  // Update BeamNG connection status
  useEffect(() => {
    if (beamngHealth) {
      setBeamNGConnection({
        ...beamng,
        connected: beamngHealth.connected || false,
        status: beamngHealth.connected ? 'connected' : 'disconnected',
      })
    }
  }, [beamngHealth])

  // Connect to BeamNG mutation
  const connectMutation = useMutation({
    mutationFn: () => beamngService.connect({ host: beamng.host, port: beamng.port }),
    onSuccess: (data) => {
      toast.success('Conectado ao BeamNG.drive!')
      updateBeamNGStatus('connected')
      refetchHealth()
    },
    onError: (error: any) => {
      toast.error('Falha ao conectar ao BeamNG: ' + (error.message || 'Erro desconhecido'))
      updateBeamNGStatus('error')
    },
  })

  // Execute crash simulation mutation
  const crashMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle) throw new Error('Select a vehicle')
      
      setIsSimulating(true)
      setSimulationProgress(0)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSimulationProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      
      try {
        // Execute crash
        const crashResult = await beamngService.executeCrash({
          vehicle_id: selectedVehicle.id,
          crash_type: selectedScenario.id,
          target_speed_kmh: customSpeed,
          impact_angle: selectedScenario.angle,
          record_telemetry: true,
        })
        
        setSimulationProgress(95)
        
        // Generate damage report
        const damageReport = await damageService.analyzeCrash({
          simulation_data: crashResult,
          vehicle_model: selectedVehicle.model,
          analysis_depth: 'detailed',
          include_repair_estimate: true,
        })
        
        setSimulationProgress(100)
        clearInterval(progressInterval)
        
        return damageReport
      } catch (error) {
        clearInterval(progressInterval)
        throw error
      }
    },
    onSuccess: (data) => {
      setIsSimulating(false)
      toast.success('Simulation completed! Analyzing damages...')
      setCurrentDamageAssessment(data.data)
      navigate('/results')
    },
    onError: (error: any) => {
      setIsSimulating(false)
      setSimulationProgress(0)
      toast.error('Simulation error: ' + (error.message || 'Unknown error'))
    },
  })

  // Demo mode - simulate without real BeamNG
  const runDemoSimulation = async () => {
    if (!selectedVehicle) {
      toast.error('Select a vehicle first')
      return
    }
    
    setIsSimulating(true)
    setSimulationProgress(0)
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 300))
      setSimulationProgress(i)
    }
    
    // Create mock damage assessment
    const mockDamageAssessment = {
      id: `demo-${Date.now()}`,
      vehicle_vin: selectedVehicle.vin,
      assessment_type: 'crash_simulation',
      assessor_name: 'BeamNG AI',
      assessment_date: new Date().toISOString(),
      overall_severity: 'moderate' as const,
      total_estimated_cost: 8500,
      total_estimated_hours: 24,
      vehicle_drivable: false,
      towing_required: true,
      crash_data: {
        simulation_id: `sim-${Date.now()}`,
        crash_type: selectedScenario.id,
        impact_speed_kmh: customSpeed,
        impact_angle_degrees: selectedScenario.angle,
        impact_location: { x: 0, y: 0, z: 0 },
        deformation_energy: customSpeed * 150,
        crash_timestamp: new Date().toISOString(),
        environmental_factors: {},
      },
      damage_zones: [
        {
          zone_id: 'front',
          zone_name: 'Front Area',
          affected_components: ['front_bumper', 'hood', 'headlights'],
          damage_percentage: 65,
          repair_priority: 1,
          access_difficulty: 'easy',
        },
      ],
      component_damages: [
        {
          component_id: 'front_bumper',
          component_name: 'Para-choque Dianteiro',
          part_number: '5NA807221AGRU',
          damage_type: 'body_panel' as const,
          severity: 'severe' as const,
          damage_description: 'Bumper completely deformed',
          repair_action: 'Complete replacement required',
          replacement_required: true,
          estimated_repair_hours: 2,
          estimated_cost: 850,
          safety_critical: false,
          affects_drivability: false,
        },
        {
          component_id: 'hood',
          component_name: 'Hood',
          part_number: '5NA823031',
          damage_type: 'body_panel' as const,
          severity: 'moderate' as const,
          damage_description: 'Dented hood with deformation',
          repair_action: 'Repair and paint',
          replacement_required: false,
          estimated_repair_hours: 6,
          estimated_cost: 1800,
          safety_critical: false,
          affects_drivability: false,
        },
        {
          component_id: 'left_headlight',
          component_name: 'Left Headlight',
          part_number: '5NA941005',
          damage_type: 'electrical' as const,
          severity: 'severe' as const,
          damage_description: 'Broken headlight',
          repair_action: 'Complete replacement',
          replacement_required: true,
          estimated_repair_hours: 1,
          estimated_cost: 2200,
          safety_critical: true,
          affects_drivability: false,
        },
        {
          component_id: 'left_fender',
          component_name: 'Left Fender',
          part_number: '5NA821021',
          damage_type: 'body_panel' as const,
          severity: 'moderate' as const,
          damage_description: 'Dented fender',
          repair_action: 'Repair and paint',
          replacement_required: false,
          estimated_repair_hours: 4,
          estimated_cost: 1200,
          safety_critical: false,
          affects_drivability: false,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    setIsSimulating(false)
    toast.success('Demo simulation completed!')
    setCurrentDamageAssessment(mockDamageAssessment as any)
    navigate('/results')
  }

  const vehicles = vehiclesData || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-8">
        <div className="vw-container">
          <h1 className="text-4xl font-bold mb-2">🚗 Collision Simulation</h1>
          <p className="text-vw-blue-light">Configure and run your simulation in BeamNG.drive</p>
        </div>
      </div>

      <div className="vw-container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Status */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {beamng.connected ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-500" />
                  )}
                  Connection Status
                </h2>
                <button
                  onClick={() => refetchHealth()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  beamng.connected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {beamng.connected ? 'Conectado' : 'Desconectado'}
                </div>
                
                {!beamng.connected && (
                  <button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="vw-btn-primary"
                  >
                    {connectMutation.isPending ? 'Conectando...' : 'Conectar ao BeamNG'}
                  </button>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mt-3">
                Host: {beamng.host}:{beamng.port}
              </p>
            </motion.div>

            {/* Vehicle Selection */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-vw-blue" />
                Selected Vehicle
              </h2>
              
              {selectedVehicle ? (
                <div className="flex items-center justify-between p-4 bg-vw-blue/5 rounded-lg border border-vw-blue/20">
                  <div>
                    <h3 className="font-semibold text-lg text-vw-blue">
                      VW {selectedVehicle.model}
                    </h3>
                    <p className="text-gray-600">
                      Year: {selectedVehicle.year} • VIN: {selectedVehicle.vin}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="vw-btn-outline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">No vehicle selected</p>
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="vw-btn-primary"
                  >
                    Select Vehicle
                  </button>
                </div>
              )}
            </motion.div>

            {/* Crash Scenario */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-vw-blue" />
                Collision Type
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CRASH_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setSelectedScenario(scenario)
                      setCustomSpeed(scenario.speed)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      selectedScenario.id === scenario.id
                        ? 'border-vw-blue bg-vw-blue/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">{scenario.icon}</span>
                    <span className="font-medium text-sm">{scenario.name}</span>
                    <span className="text-xs text-gray-500 block mt-1">
                      {scenario.speed} km/h
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Speed Configuration */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-vw-blue" />
                Impact Velocity
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={customSpeed}
                    onChange={(e) => setCustomSpeed(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-vw-blue"
                  />
                  <div className="w-24 text-center">
                    <span className="text-3xl font-bold text-vw-blue">{customSpeed}</span>
                    <span className="text-gray-500 text-sm block">km/h</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500">
                  <span>10 km/h (Light)</span>
                  <span>60 km/h (Moderate)</span>
                  <span>120 km/h (Severe)</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Execute */}
          <div className="space-y-6">
            {/* Execute Simulation */}
            <motion.div 
              className="vw-card bg-gradient-to-br from-vw-blue to-vw-blue-dark text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Execute Simulation
              </h2>
              
              {isSimulating ? (
                <div className="space-y-4">
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <motion.div
                      className="bg-white h-4 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-sm">
                    {simulationProgress < 50 
                      ? 'Executing simulation...'
                      : simulationProgress < 90
                        ? 'Analyzing damage...'
                        : 'Generating report...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Vehicle:</span>
                      <span>{selectedVehicle?.model || 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Scenario:</span>
                      <span>{selectedScenario.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Velocity:</span>
                      <span>{customSpeed} km/h</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => beamng.connected ? crashMutation.mutate() : runDemoSimulation()}
                    disabled={!selectedVehicle || isSimulating}
                    className="w-full py-4 bg-white text-vw-blue font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    {beamng.connected ? 'Start Simulation' : 'Run Demo'}
                  </button>
                  
                  {!beamng.connected && (
                    <p className="text-xs text-white/70 text-center">
                      Demo mode: simulation without BeamNG
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Info Card */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Como funciona
              </h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. Select a VW vehicle</li>
                <li>2. Choose collision type</li>
                <li>3. Adjust impact velocity</li>
                <li>4. Execute the simulation</li>
                <li>5. Receive damage report</li>
              </ol>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Vehicle Selector Modal */}
      <AnimatePresence>
        {showVehicleSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue">Select Vehicle</h2>
                <button 
                  onClick={() => setShowVehicleSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {vehiclesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-vw-blue mx-auto mb-4 rounded-full"></div>
                    <p>Loading vehicles...</p>
                  </div>
                ) : (Array.isArray(vehicles) ? vehicles : []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>No vehicles found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(vehicles) ? vehicles : []).map((vehicle: Vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => {
                          setSelectedVehicle(vehicle)
                          setShowVehicleSelector(false)
                          toast.success(`Vehicle ${vehicle.model} selected!`)
                        }}
                        className="w-full p-4 border rounded-lg hover:bg-vw-blue/5 hover:border-vw-blue transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-vw-blue rounded-lg flex items-center justify-center">
                            <Car className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">VW {vehicle.model}</h3>
                            <p className="text-sm text-gray-500">
                              Year: {vehicle.year} • VIN: {vehicle.vin}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}