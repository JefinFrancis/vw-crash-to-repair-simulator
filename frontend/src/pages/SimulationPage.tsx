import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Car, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Target,
  Gauge,
  Radio,
  ExternalLink
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { beamngService, LatestCrashResponse } from '../services/beamngService'
import { vehicleService } from '../services/vehicleService'
import { Vehicle } from '../types'

// Tipos de cenário de colisão
const CRASH_SCENARIOS = [
  { id: 'frontal', name: 'Colisão Frontal', icon: '🚗💥', speed: 50, angle: 0 },
  { id: 'side', name: 'Colisão Lateral', icon: '🚗⬅️', speed: 40, angle: 90 },
  { id: 'rear', name: 'Colisão Traseira', icon: '💥🚗', speed: 30, angle: 180 },
  { id: 'rollover', name: 'Capotamento', icon: '🔄🚗', speed: 60, angle: 45 },
]

export function SimulationPage() {
  const navigate = useNavigate()
  const { 
    selectedVehicle, 
    setSelectedVehicle, 
    setCurrentDamageAssessment 
  } = useAppStore()
  
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(CRASH_SCENARIOS[0])
  const [customSpeed, setCustomSpeed] = useState(50)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [lastSeenCrashId, setLastSeenCrashId] = useState<string | null>(null)

  // Fetch available vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 50 }),
  })

  // Poll for latest crash from BeamNG mod (every 2 seconds)
  const { data: latestCrash, refetch: refetchCrash } = useQuery({
    queryKey: ['latest-crash'],
    queryFn: () => beamngService.getLatestCrash(),
    refetchInterval: 2000,
    staleTime: 1000,
  })

  // Mostrar notificação quando novo crash for detectado
  useEffect(() => {
    if (latestCrash?.has_crash && latestCrash.crash_id && latestCrash.crash_id !== lastSeenCrashId) {
      setLastSeenCrashId(latestCrash.crash_id)
      toast.success(`🚗💥 Nova colisão detectada! Dano: ${latestCrash.total_damage?.toFixed(1) ?? 0}%`, {
        duration: 5000,
        icon: '🔔',
      })
    }
  }, [latestCrash?.crash_id, lastSeenCrashId])

  // Modo demo - simular sem BeamNG real
  const runDemoSimulation = async () => {
    if (!selectedVehicle) {
      toast.error('Selecione um veículo primeiro')
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
    toast.success('Simulação demo concluída!')
    setCurrentDamageAssessment(mockDamageAssessment as any)
    navigate('/results')
  }

  const vehicles = vehiclesData || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-8">
        <div className="vw-container">
          <h1 className="text-4xl font-bold mb-2">🚗 Simulação de Colisão</h1>
          <p className="text-vw-blue-light">Configure e execute sua simulação no BeamNG.drive</p>
        </div>
      </div>

      <div className="vw-container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Selection */}
            <motion.div 
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-vw-blue" />
                Veículo Selecionado
              </h2>
              
              {selectedVehicle ? (
                <div className="flex items-center justify-between p-4 bg-vw-blue/5 rounded-lg border border-vw-blue/20">
                  <div>
                    <h3 className="font-semibold text-lg text-vw-blue">
                      VW {selectedVehicle.model}
                    </h3>
                    <p className="text-gray-600">
                      Ano: {selectedVehicle.year} • VIN: {selectedVehicle.vin}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="vw-btn-outline"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">Nenhum veículo selecionado</p>
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="vw-btn-primary"
                  >
                    Selecionar Veículo
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
                Tipo de Colisão
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
                Velocidade de Impacto
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
                  <span>10 km/h (Leve)</span>
                  <span>60 km/h (Moderado)</span>
                  <span>120 km/h (Severo)</span>
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
                Executar Simulação
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
                      ? 'Executando simulação...'
                      : simulationProgress < 90
                        ? 'Analisando danos...'
                        : 'Gerando relatório...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Veículo:</span>
                      <span>{selectedVehicle?.model || 'Não selecionado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Cenário:</span>
                      <span>{selectedScenario.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Velocidade:</span>
                      <span>{customSpeed} km/h</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => runDemoSimulation()}
                    disabled={!selectedVehicle || isSimulating}
                    className="w-full py-4 bg-white text-vw-blue font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Executar Simulação Demo
                  </button>
                  
                  <p className="text-xs text-white/70 text-center">
                    Dados de colisão são detectados automaticamente do BeamNG via webhook
                  </p>
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
                <li>1. Selecione um veículo VW</li>
                <li>2. Escolha o tipo de colisão</li>
                <li>3. Ajuste a velocidade de impacto</li>
                <li>4. Execute a simulação</li>
                <li>5. Receba o relatório de danos</li>
              </ol>
            </motion.div>

            {/* Live Crash Detection */}
            <motion.div 
              className={`vw-card border-2 ${latestCrash?.has_crash ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Radio className={`h-5 w-5 ${latestCrash?.has_crash ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                Detecção ao Vivo BeamNG
              </h3>
              
              {latestCrash?.has_crash ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Colisão Detectada!
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID da Colisão:</span>
                      <span className="font-mono text-xs">{latestCrash.crash_id?.slice(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Veículo:</span>
                      <span>{latestCrash.vehicle_model || 'Desconhecido'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dano Total:</span>
                      <span className="font-bold text-red-600">{latestCrash.total_damage?.toFixed(1) ?? 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Velocidade de Impacto:</span>
                      <span>{latestCrash.speed_at_impact?.toFixed(0) ?? 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peças Danificadas:</span>
                      <span>{latestCrash.broken_parts_count ?? 0}</span>
                    </div>
                    {latestCrash.damage_by_zone && Object.keys(latestCrash.damage_by_zone).length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-gray-600 text-xs">Dano por Zona:</span>
                        <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                          {Object.entries(latestCrash.damage_by_zone).map(([zone, damage]) => (
                            <div key={zone} className="flex justify-between">
                              <span className="capitalize">{zone}:</span>
                              <span className="font-medium">{(damage as number).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      toast.success('Navegando para análise...')
                      navigate('/analysis')
                    }}
                    className="w-full mt-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver Análise Completa
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aguardando dados de colisão do BeamNG...</p>
                  <p className="text-xs text-gray-400 mt-1">Dirija e colida no BeamNG para detectar</p>
                </div>
              )}
              
              <button
                onClick={() => refetchCrash()}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
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
                <h2 className="text-xl font-bold text-vw-blue">Selecionar Veículo</h2>
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
                    <p>Carregando veículos...</p>
                  </div>
                ) : (Array.isArray(vehicles) ? vehicles : []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum veículo encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(vehicles) ? vehicles : []).map((vehicle: Vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => {
                          setSelectedVehicle(vehicle)
                          setShowVehicleSelector(false)
                          toast.success(`Veículo ${vehicle.model} selecionado!`)
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
                              Ano: {vehicle.year} • VIN: {vehicle.vin}
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