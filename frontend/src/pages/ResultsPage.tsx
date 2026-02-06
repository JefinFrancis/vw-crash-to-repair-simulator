import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Clock,
  DollarSign,
  Car,
  MapPin,
  ArrowRight,
  ArrowLeft,
  FileText,
  Package,
  Shield,
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronRight,
  Calendar,
  Gauge,
  Zap,
  Play,
  X,
  Gamepad2,
  Target
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { beamngService } from '../services/beamngService'
import { vehicleService } from '../services/vehicleService'
import { ComponentDamage, DamageSeverity, DamageAssessment, Vehicle } from '../types'
import toast from 'react-hot-toast'

// Severity color mapping
const severityColors: Record<DamageSeverity, { bg: string; text: string; border: string }> = {
  minor: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  severe: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  total_loss: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

const severityLabels: Record<DamageSeverity, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  total_loss: 'Perda Total',
}

// Format currency in BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format date in Brazilian format, always as BRT (UTC-3)
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  // Use America/Sao_Paulo timezone to ensure consistent BRT display
  const formatted = date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${formatted} BRT`
}

// Get severity from damage percentage
const getSeverityFromDamage = (totalDamage: number): DamageSeverity => {
  if (totalDamage >= 0.8) return 'total_loss'
  if (totalDamage >= 0.5) return 'severe'
  if (totalDamage >= 0.2) return 'moderate'
  return 'minor'
}

// Crash item interface for the list
interface CrashItem {
  crash_id: string
  received_at: string
  vehicle: {
    id: number | string
    name: string
    model: string
    brand: string
  }
  velocity: {
    speed_kmh: number
  }
  damage: {
    total_damage: number
    broken_parts_count: number
    broken_parts: string[]
  }
}

// Simulation scenarios
const CRASH_SCENARIOS = [
  { id: 'frontal', name: 'Colisão Frontal', icon: '🚗💥', speed: 50, angle: 0, description: 'Impacto frontal contra obstáculo fixo' },
  { id: 'side', name: 'Colisão Lateral', icon: '🚗⬅️', speed: 40, angle: 90, description: 'Impacto lateral (T-bone)' },
  { id: 'rear', name: 'Colisão Traseira', icon: '💥🚗', speed: 30, angle: 180, description: 'Impacto na traseira do veículo' },
  { id: 'rollover', name: 'Capotamento', icon: '🔄🚗', speed: 60, angle: 45, description: 'Perda de controle com capotamento' },
]

// Transform BeamNG crash data to DamageAssessment format
const transformCrashToAssessment = (crash: any, selectedVehicle?: Vehicle): DamageAssessment => {
  const totalDamage = crash.damage?.total_damage || 0
  const partDamage = crash.damage?.part_damage || {}
  
  const severity = getSeverityFromDamage(totalDamage)
  
  // Transform parts to component damages
  const componentDamages: ComponentDamage[] = Object.entries(partDamage)
    .filter(([_, damage]) => (damage as number) > 0.01)
    .map(([partPath, damage], index) => {
      const partName = partPath.split('/').pop() || partPath
      const damageLevel = damage as number
      
      let partSeverity: DamageSeverity = 'minor'
      if (damageLevel >= 0.8) partSeverity = 'severe'
      else if (damageLevel >= 0.5) partSeverity = 'moderate'
      
      return {
        component_id: `comp_${index}`,
        component_name: partName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        part_number: partPath,
        damage_type: 'body_panel' as const,
        severity: partSeverity,
        damage_description: `Dano de ${(damageLevel * 100).toFixed(0)}%`,
        repair_action: damageLevel >= 0.8 ? 'Substituir' : 'Reparar',
        replacement_required: damageLevel >= 0.8,
        estimated_repair_hours: damageLevel >= 0.8 ? 2 : 1,
        estimated_cost: damageLevel >= 0.8 ? 500 : 200,
        safety_critical: partPath.includes('suspension') || partPath.includes('brake'),
        affects_drivability: partPath.includes('engine') || partPath.includes('transmission'),
      }
    })
    .sort((a, b) => {
      const aDmg = parseFloat(a.damage_description.match(/\d+/)?.[0] || '0')
      const bDmg = parseFloat(b.damage_description.match(/\d+/)?.[0] || '0')
      return bDmg - aDmg
    })
  
  const totalCost = componentDamages.reduce((sum, c) => sum + c.estimated_cost, 0)
  const totalHours = componentDamages.reduce((sum, c) => sum + c.estimated_repair_hours, 0)
  
  return {
    id: crash.crash_id || 'unknown',
    vehicle_vin: selectedVehicle?.vin || crash.vehicle?.name || 'BeamNG Vehicle',
    assessment_type: 'beamng_crash',
    assessor_name: 'BeamNG Mod',
    assessment_date: crash.received_at || new Date().toISOString(),
    crash_data: {
      simulation_id: crash.crash_id || 'unknown',
      crash_type: 'collision',
      impact_speed_kmh: crash.velocity?.speed_kmh || 0,
      impact_angle_degrees: 0,
      impact_location: crash.position || { x: 0, y: 0, z: 0 },
      deformation_energy: totalDamage * 10000,
      crash_timestamp: crash.received_at || new Date().toISOString(),
      environmental_factors: {},
    },
    overall_severity: severity,
    total_estimated_cost: totalCost,
    total_estimated_hours: totalHours,
    vehicle_drivable: totalDamage < 0.5,
    towing_required: totalDamage >= 0.7,
    damage_zones: [],
    component_damages: componentDamages,
    created_at: crash.received_at || new Date().toISOString(),
    updated_at: crash.received_at || new Date().toISOString(),
  }
}

export function ResultsPage() {
  const navigate = useNavigate()
  const { selectedVehicle, setSelectedVehicle } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [crashes, setCrashes] = useState<CrashItem[]>([])
  const [selectedCrash, setSelectedCrash] = useState<DamageAssessment | null>(null)
  const [vehicleToUse, setVehicleToUse] = useState<Vehicle | undefined>(selectedVehicle)
  const [showSimulation, setShowSimulation] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(CRASH_SCENARIOS[0])
  const [customSpeed, setCustomSpeed] = useState(50)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [showLanding, setShowLanding] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [pendingCrash, setPendingCrash] = useState<CrashItem | null>(null)

  // Analysis steps for the AI evaluation animation
  const analysisSteps = [
    { icon: '📡', title: 'Recebendo dados do sensor', description: 'Coletando telemetria da colisão...' },
    { icon: '🔍', title: 'Analisando impacto', description: 'Calculando forças de deformação...' },
    { icon: '🤖', title: 'Processamento IA', description: 'Identificando componentes danificados...' },
    { icon: '🔧', title: 'Avaliando reparos', description: 'Estimando custos e tempo de mão de obra...' },
    { icon: '📊', title: 'Gerando relatório', description: 'Preparando análise completa...' },
  ]

  // Handle landing page option selection
  const handleDriveInBeamNG = () => {
    setShowLanding(false)
  }

  const handleSimulateCrash = () => {
    setShowLanding(false)
    setShowSimulation(true)
  }

  // Fetch crash history
  useEffect(() => {
    const fetchCrashHistory = async () => {
      try {
        setIsLoading(true)
        
        // If no vehicle selected, fetch the default vehicle (T-Cross)
        let vehicle = selectedVehicle
        if (!vehicle) {
          try {
            const vehicles = await vehicleService.list()
            if (vehicles && vehicles.length > 0) {
              vehicle = vehicles[0]
              setSelectedVehicle(vehicle)
              setVehicleToUse(vehicle)
            }
          } catch (vehicleErr) {
            console.warn('Could not fetch default vehicle:', vehicleErr)
          }
        } else {
          setVehicleToUse(vehicle)
        }
        
        // Get all crash history
        const history = await beamngService.getCrashHistory(50, 0)
        
        if (history.crashes && history.crashes.length > 0) {
          setCrashes(history.crashes)
        } else {
          setCrashes([])
        }
      } catch (err) {
        console.error('Failed to fetch crash history:', err)
        setCrashes([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCrashHistory()
  }, [selectedVehicle, setSelectedVehicle])

  // Auto-poll for new crashes when not on landing page (user chose "Drive in BeamNG")
  useEffect(() => {
    if (showLanding || selectedCrash) return // Don't poll on landing or detail view

    const pollInterval = setInterval(async () => {
      try {
        const history = await beamngService.getCrashHistory(50, 0)
        if (history.crashes && history.crashes.length > 0) {
          // Check if there are new crashes
          const currentFirstId = crashes[0]?.crash_id
          const newFirstId = history.crashes[0]?.crash_id
          if (newFirstId && newFirstId !== currentFirstId) {
            setCrashes(history.crashes)
            toast.success('🚨 Nova colisão detectada!', { icon: '🚗💥' })
          }
        }
      } catch (err) {
        // Silently fail on poll errors
        console.debug('Poll error:', err)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [showLanding, selectedCrash, crashes])

  // View crash details with AI analysis animation
  const viewCrashDetails = async (crash: CrashItem) => {
    setPendingCrash(crash)
    setIsAnalyzing(true)
    setAnalysisStep(0)

    // Animate through analysis steps
    for (let step = 0; step < 5; step++) {
      await new Promise(r => setTimeout(r, 800))
      setAnalysisStep(step + 1)
    }

    // Final delay before showing results
    await new Promise(r => setTimeout(r, 500))

    try {
      const fullCrash = await beamngService.getCrashById(crash.crash_id)
      const assessment = transformCrashToAssessment(fullCrash, vehicleToUse)
      setSelectedCrash(assessment)
    } catch (err) {
      const assessment = transformCrashToAssessment(crash, vehicleToUse)
      setSelectedCrash(assessment)
    }

    setIsAnalyzing(false)
    setPendingCrash(null)
  }

  const backToList = () => setSelectedCrash(null)

  const refreshCrashes = async () => {
    setIsLoading(true)
    try {
      const history = await beamngService.getCrashHistory(50, 0)
      if (history.crashes) {
        setCrashes(history.crashes)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Run demo simulation
  const runDemoSimulation = async () => {
    if (!vehicleToUse) {
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
    
    // Generate random damage values
    const totalDamage = Math.random() * 0.6 + 0.2 // Random between 20-80%
    const brokenParts = ['front_bumper', 'hood', 'left_fender', 'headlight_left', 'radiator', 'grille', 'right_fender']
      .slice(0, Math.floor(Math.random() * 5) + 2)
    
    // Create parts with damage
    const parts = brokenParts.map((partId, index) => ({
      name: partId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      partId,
      damage: Math.random() * 0.7 + 0.3 // Random between 30-100%
    }))
    
    // Create part_damage map
    const partDamage: Record<string, number> = {}
    parts.forEach(p => { partDamage[p.partId] = p.damage })
    
    // Build crash event to submit to backend
    const crashEvent = {
      event_type: 'crash_detected',
      timestamp: Math.floor(Date.now() / 1000),
      timestamp_iso: new Date().toISOString(),
      vehicle: {
        id: vehicleToUse.id,
        name: vehicleToUse.model,
        model: vehicleToUse.model,
        brand: 'Volkswagen',
        year: vehicleToUse.year || 2024,
        plate: 'DEMO-0000'
      },
      position: {
        x: Math.random() * 1000 - 500,
        y: Math.random() * 1000 - 500,
        z: 0
      },
      velocity: {
        x: customSpeed * 0.277 * Math.cos(selectedScenario.angle * Math.PI / 180),
        y: customSpeed * 0.277 * Math.sin(selectedScenario.angle * Math.PI / 180),
        z: 0,
        speed_ms: customSpeed * 0.277,
        speed_kmh: customSpeed,
        speed_mph: customSpeed * 0.621
      },
      damage: {
        total_damage: totalDamage,
        previous_damage: 0,
        damage_delta: totalDamage,
        part_damage: partDamage,
        damage_by_zone: {
          front: selectedScenario.id === 'frontal' ? totalDamage * 0.8 : totalDamage * 0.2,
          rear: selectedScenario.id === 'rear' ? totalDamage * 0.8 : totalDamage * 0.1,
          left: selectedScenario.id === 'side' ? totalDamage * 0.8 : totalDamage * 0.15,
          right: totalDamage * 0.1,
          top: selectedScenario.id === 'rollover' ? totalDamage * 0.6 : 0,
          bottom: 0
        },
        broken_parts: brokenParts,
        broken_parts_count: brokenParts.length,
        damaged_parts_count: parts.length,
        total_parts_count: 42,
        parts
      },
      metadata: {
        mod_version: '1.0.0-demo',
        beamng_version: 'simulated',
        damage_threshold: 0.1
      }
    }
    
    try {
      // Submit to backend to persist
      const response = await beamngService.submitCrashEvent(crashEvent)
      
      // Refresh the crash list from backend
      const history = await beamngService.getCrashHistory(50, 0)
      if (history.crashes) {
        setCrashes(history.crashes)
      }
      
      toast.success('🚗💥 Colisão simulada e salva com sucesso!')
    } catch (err) {
      console.error('Failed to persist simulated crash:', err)
      // Fallback: add to local state if backend fails
      const mockCrash: CrashItem = {
        crash_id: `demo-${Date.now()}`,
        received_at: new Date().toISOString(),
        vehicle: crashEvent.vehicle,
        velocity: { speed_kmh: customSpeed },
        damage: {
          total_damage: totalDamage,
          broken_parts_count: brokenParts.length,
          broken_parts: brokenParts
        }
      }
      setCrashes(prev => [mockCrash, ...prev])
      toast.success('🚗💥 Colisão simulada (local apenas)')
    }
    
    setIsSimulating(false)
    setShowSimulation(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-vw-blue mx-auto mb-4" />
          <p className="text-gray-600">Carregando histórico de colisões...</p>
        </div>
      </div>
    )
  }

  // AI Analysis animation screen
  if (isAnalyzing && pendingCrash) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="text-6xl mb-4 flex items-center justify-center">
              <Zap className="w-14 h-14 text-yellow-300 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Análise de Dados
            </h1>
            <p className="text-blue-200">
              {vehicleToUse?.model || 'Veículo'} • {formatDate(pendingCrash.received_at)}
            </p>
          </motion.div>

          {/* Analysis Steps */}
          <div className="space-y-4 mb-8">
            {analysisSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ 
                  opacity: analysisStep > index ? 1 : analysisStep === index ? 0.8 : 0.3,
                  x: 0 
                }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  analysisStep > index 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : analysisStep === index 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className={`text-3xl transition-transform duration-300 ${
                  analysisStep === index ? 'animate-pulse scale-110' : ''
                }`}>
                  {analysisStep > index ? '✅' : step.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold transition-colors ${
                    analysisStep > index ? 'text-green-400' : analysisStep === index ? 'text-blue-300' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm transition-colors ${
                    analysisStep >= index ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
                {analysisStep === index && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                )}
                {analysisStep > index && (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(analysisStep / analysisSteps.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-blue-200 text-sm">
            {analysisStep < analysisSteps.length 
              ? `Processando... ${Math.round((analysisStep / analysisSteps.length) * 100)}%`
              : 'Análise concluída! Carregando resultados...'}
          </p>

          {/* Crash preview info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Velocidade no impacto:</span>
              <span className="text-white font-semibold">{pendingCrash.velocity?.speed_kmh?.toFixed(0) || '?'} km/h</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Dano detectado:</span>
              <span className="text-white font-semibold">{((pendingCrash.damage?.total_damage || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Componentes afetados:</span>
              <span className="text-white font-semibold">{pendingCrash.damage?.broken_parts_count || 0} peças</span>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Landing page with two options
  if (showLanding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🚗 Como você quer começar?
            </h1>
            <p className="text-xl text-gray-300">
              Escolha uma opção para registrar um sinistro
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Drive in BeamNG Option */}
            <motion.button
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDriveInBeamNG}
              className="group relative bg-gradient-to-br from-vw-blue to-blue-700 rounded-3xl p-8 text-left shadow-2xl hover:shadow-vw-blue/30 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Dirigir no BeamNG.drive
                </h2>
                <p className="text-blue-100 text-lg mb-6">
                  Dirija livremente no simulador. Colisões serão detectadas e registradas automaticamente em tempo real.
                </p>
                <div className="flex items-center text-white font-semibold">
                  <span>Modo ao vivo</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
            </motion.button>

            {/* Simulate Crash Option */}
            <motion.button
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSimulateCrash}
              className="group relative bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 text-left shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Simular uma Colisão
                </h2>
                <p className="text-orange-100 text-lg mb-6">
                  Gere dados de colisão simulados instantaneamente. Escolha o tipo de impacto e velocidade.
                </p>
                <div className="flex items-center text-white font-semibold">
                  <span>Simulação rápida</span>
                  <Zap className="ml-2 w-5 h-5 group-hover:scale-125 transition-transform" />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
            </motion.button>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-gray-400 mt-8"
          >
            Veículo selecionado: <span className="text-white font-semibold">{vehicleToUse?.model || 'T-Cross'}</span>
          </motion.p>
        </div>
      </div>
    )
  }

  // Detail view
  if (selectedCrash) {
    const { overall_severity, total_estimated_cost, total_estimated_hours, vehicle_drivable, towing_required, crash_data, component_damages } = selectedCrash
    const partsToReplace = component_damages?.filter(c => c.replacement_required).length || 0
    const partsToRepair = (component_damages?.length || 0) - partsToReplace
    const safetyCritical = component_damages?.filter(c => c.safety_critical).length || 0
    const laborCost = total_estimated_hours * 150
    const partsCost = total_estimated_cost - laborCost

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className={`py-8 ${overall_severity === 'total_loss' ? 'bg-red-600' : overall_severity === 'severe' ? 'bg-orange-600' : overall_severity === 'moderate' ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>
          <div className="vw-container">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={backToList} className="flex items-center gap-2 text-white/80 hover:text-white mb-4">
                  <ArrowLeft className="h-5 w-5" /> Voltar para Lista
                </button>
                <h1 className="text-4xl font-bold mb-2">📊 Análise de Danos</h1>
                <p className="opacity-90">{vehicleToUse?.model || 'Veículo'} • {formatDate(selectedCrash.assessment_date)}</p>
              </div>
              <div className={`px-5 py-2 rounded-full font-bold text-lg shadow-lg ${
                overall_severity === 'total_loss' ? 'bg-white text-red-600' :
                overall_severity === 'severe' ? 'bg-white text-orange-600' :
                overall_severity === 'moderate' ? 'bg-white text-yellow-600' :
                'bg-white text-green-600'
              }`}>
                {severityLabels[overall_severity]}
              </div>
            </div>
          </div>
        </div>

        <div className="vw-container py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${severityColors[overall_severity].bg}`}>
                  <AlertTriangle className={`h-5 w-5 ${severityColors[overall_severity].text}`} />
                </div>
                <span className="text-gray-500 text-sm">Severidade</span>
              </div>
              <p className={`text-2xl font-bold ${severityColors[overall_severity].text}`}>{severityLabels[overall_severity]}</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-vw-blue/10"><DollarSign className="h-5 w-5 text-vw-blue" /></div>
                <span className="text-gray-500 text-sm">Custo Estimado</span>
              </div>
              <p className="text-2xl font-bold text-vw-blue">{formatBRL(total_estimated_cost)}</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100"><Clock className="h-5 w-5 text-purple-600" /></div>
                <span className="text-gray-500 text-sm">Tempo Estimado</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{total_estimated_hours}h</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${vehicle_drivable ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Car className={`h-5 w-5 ${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <span className="text-gray-500 text-sm">Condição</span>
              </div>
              <p className={`text-lg font-bold ${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`}>{vehicle_drivable ? 'Dirigível' : 'Não Dirigível'}</p>
              {towing_required && <p className="text-sm text-red-500">Guincho necessário</p>}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {crash_data && (
                <div className="vw-card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-vw-blue" /> Dados da Colisão
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Tipo</p><p className="font-semibold capitalize">{crash_data.crash_type}</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Velocidade</p><p className="font-semibold">{crash_data.impact_speed_kmh.toFixed(1)} km/h</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Ângulo</p><p className="font-semibold">{crash_data.impact_angle_degrees}°</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Energia</p><p className="font-semibold">{crash_data.deformation_energy.toFixed(0)} J</p></div>
                  </div>
                </div>
              )}

              <div className="vw-card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-vw-blue" /> Componentes Danificados ({component_damages?.length || 0})
                </h2>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {component_damages?.map((damage: ComponentDamage) => (
                    <div key={damage.component_id} className={`p-4 border rounded-lg ${severityColors[damage.severity].border}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{damage.component_name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[damage.severity].bg} ${severityColors[damage.severity].text}`}>{severityLabels[damage.severity]}</span>
                            {damage.safety_critical && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1"><Shield className="h-3 w-3" /> Safety</span>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{damage.damage_description}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-500"><Clock className="h-4 w-4" />{damage.estimated_repair_hours}h</span>
                            <span className={`flex items-center gap-1 ${damage.replacement_required ? 'text-orange-600' : 'text-green-600'}`}>
                              {damage.replacement_required ? <><XCircle className="h-4 w-4" />Substituir</> : <><CheckCircle className="h-4 w-4" />Reparar</>}
                            </span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-vw-blue">{formatBRL(damage.estimated_cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="vw-card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-vw-blue" /> Resumo do Orçamento</h2>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Peças ({partsToReplace} subst.)</span><span className="font-medium">{formatBRL(partsCost > 0 ? partsCost : total_estimated_cost * 0.6)}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Mão de obra ({total_estimated_hours}h)</span><span className="font-medium">{formatBRL(laborCost > 0 ? laborCost : total_estimated_cost * 0.4)}</span></div>
                  <div className="flex justify-between py-3 text-lg font-bold"><span>Total</span><span className="text-vw-blue">{formatBRL(total_estimated_cost)}</span></div>
                </div>
              </div>

              <div className="vw-card">
                <h3 className="font-semibold mb-4">Resumo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Substituir</span><span className="font-semibold text-orange-600">{partsToReplace}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Reparar</span><span className="font-semibold text-green-600">{partsToRepair}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Segurança</span><span className="font-semibold text-red-600">{safetyCritical}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => navigate('/dealers')} className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3">
                  <Wrench className="h-6 w-6" /> 🔧 Reparar Meu Carro <ArrowRight className="h-6 w-6" />
                </button>
                <button onClick={() => navigate('/dealers')} className="w-full vw-btn-primary flex items-center justify-center gap-2"><MapPin className="h-5 w-5" /> Ver Concessionárias</button>
                <button onClick={backToList} className="w-full vw-btn-outline">Voltar para Lista</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Simulation Modal - rendered inline to prevent re-creation on state changes
  const renderSimulationModal = () => (
    <AnimatePresence>
      {showSimulation && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSimulating && setShowSimulation(false)}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Simular Colisão</h2>
                    <p className="text-white/80">{vehicleToUse?.model || 'Veículo'}</p>
                  </div>
                </div>
                {!isSimulating && (
                  <button
                    onClick={() => setShowSimulation(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isSimulating ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-6 animate-bounce">{selectedScenario.icon}</div>
                  <h3 className="text-xl font-bold mb-2">Simulando {selectedScenario.name}...</h3>
                  <p className="text-gray-500 mb-6">Velocidade: {customSpeed} km/h</p>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">{simulationProgress}% concluído</p>
                </div>
              ) : (
                <>
                  {/* Scenario Selection */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Tipo de Colisão</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {CRASH_SCENARIOS.map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => {
                            setSelectedScenario(scenario)
                            setCustomSpeed(scenario.speed)
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedScenario.id === scenario.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <div className="text-2xl mb-2">{scenario.icon}</div>
                          <h4 className="font-semibold text-gray-800">{scenario.name}</h4>
                          <p className="text-xs text-gray-500">{scenario.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed Control */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Gauge className="h-5 w-5" /> Velocidade do Impacto
                    </h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="10"
                        max="120"
                        value={customSpeed}
                        onChange={(e) => setCustomSpeed(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-2xl font-bold text-orange-600 w-24 text-right">{customSpeed} km/h</span>
                    </div>
                  </div>

                  {/* Run Button */}
                  <button
                    onClick={runDemoSimulation}
                    className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all"
                  >
                    <Play className="h-6 w-6" />
                    Executar Simulação
                  </button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    💡 Na versão completa, a simulação é feita no BeamNG.drive
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Main list view
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="py-8 bg-vw-blue text-white">
        <div className="vw-container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Car className="h-8 w-8" />
                Sinistros do Veículo
              </h1>
              <p className="opacity-90">
                {vehicleToUse?.model || 'Veículo'} • {crashes.length} {crashes.length === 1 ? 'colisão registrada' : 'colisões registradas'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshCrashes}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSimulation(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                <Zap className="h-5 w-5" />
                Simular Colisão
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Crash Cards */}
        {crashes.length > 0 ? (
          <div className="grid gap-4">
            <AnimatePresence>
              {crashes.map((crash, index) => {
                const severity = getSeverityFromDamage(crash.damage.total_damage)
                const damagePercent = (crash.damage.total_damage * 100).toFixed(0)
                
                return (
                  <motion.div
                    key={crash.crash_id}
                    className="vw-card hover:shadow-lg transition-shadow cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => viewCrashDetails(crash)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-20 rounded-full ${severity === 'total_loss' ? 'bg-red-500' : severity === 'severe' ? 'bg-orange-500' : severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                      <div className={`p-3 rounded-lg ${severityColors[severity].bg}`}>
                        <Car className={`h-8 w-8 ${severityColors[severity].text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">Colisão #{crashes.length - index}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[severity].bg} ${severityColors[severity].text}`}>
                            {severityLabels[severity]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(crash.received_at)}</span>
                          <span className="flex items-center gap-1"><Gauge className="h-4 w-4" />{crash.velocity.speed_kmh.toFixed(0)} km/h</span>
                          <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{damagePercent}% de dano</span>
                          <span className="flex items-center gap-1"><Package className="h-4 w-4" />{crash.damage.broken_parts_count} peças</span>
                        </div>
                        {crash.damage.broken_parts && crash.damage.broken_parts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {crash.damage.broken_parts.slice(0, 4).map((part, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{part}</span>
                            ))}
                            {crash.damage.broken_parts.length > 4 && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">+{crash.damage.broken_parts.length - 4} mais</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${severityColors[severity].text}`}>{damagePercent}%</p>
                          <p className="text-xs text-gray-500">dano total</p>
                        </div>
                        <ChevronRight className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <motion.div
            className="flex flex-col items-center justify-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg text-center">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <Car className="h-16 w-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Nenhum sinistro ainda</h2>
              <p className="text-xl text-gray-500 mb-2">🚗 Ainda dirigindo por aí...</p>
              <p className="text-gray-400 mb-8">
                Os sinistros aparecem aqui automaticamente quando detectados pelo simulador BeamNG.drive, 
                ou você pode simular uma colisão para demonstração.
              </p>
              <button
                onClick={() => setShowSimulation(true)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
              >
                <Zap className="h-6 w-6" />
                Simular uma Colisão
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer Actions (when there are crashes) */}
        {crashes.length > 0 && (
          <div className="mt-8 flex gap-4 justify-center">
            <button onClick={() => navigate('/dealers')} className="vw-btn-primary flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Ver Concessionárias
            </button>
          </div>
        )}
      </div>

      {/* Simulation Modal */}
      {renderSimulationModal()}
    </div>
  )
}
