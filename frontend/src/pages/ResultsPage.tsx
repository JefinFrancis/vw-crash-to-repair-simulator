import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,

  Car,
  DollarSign,
  Gauge,
  Gamepad2,
  Play,
  RefreshCw,
  Search,
  Target,
  X,
  Zap,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  Clock,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { beamngService, CrashEventSubmission } from '../services/beamngService'
import { partService } from '../services/partService'
import { Part } from '../types'
import {
  TOTAL_VEHICLE_PARTS,
  severityColors,
  severityLabels,
  getSeverityFromDamage,
  computeTotalDamage,
  isUnibodyTotalled,
  calculateCrashCost,
  formatBRL,
} from '../utils/damageCalculations'

// Format date in BRT
const parseDate = (dateString: string) => {
  const normalized =
    dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
      ? dateString
      : dateString + 'Z'
  return new Date(normalized)
}

const formatDateOnly = (dateString: string) =>
  parseDate(dateString).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

const formatTimeOnly = (dateString: string) =>
  parseDate(dateString).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

// Parts affected per crash scenario (using exact English names from DB for matching)
const SCENARIO_PARTS: Record<string, { primary: string[]; secondary: string[] }> = {
  frontal: {
    primary: ['Front Bumper', 'T-Cross Hood', 'Radiator', 'Halogen Left Headlight', 'Halogen Right Headlight'],
    secondary: ['Front Left Fender', 'Front Right Fender', 'Windshield', 'Left DRL only', 'Right DRL only', 'Front Struts', 'Independent Front Suspension', 'Stock Turbocharger', 'Stock Engine Mounts'],
  },
  side: {
    primary: ['Front Left Door', 'Front Left Door Glass', 'Left Mirror', 'Front Left Fender'],
    secondary: ['Rear Left Door', 'Rear Left Door Glass', 'Left DRL only', 'Halogen Left Headlight', 'Left Taillight', 'Front Sway Bar', 'Driver Seat'],
  },
  rear: {
    primary: ['T-Cross Rear Bumper', 'Tailgate', 'Tailgate Glass', 'Left Taillight', 'Right Taillight'],
    secondary: ['Rear Shocks', 'Rear Springs', 'Gasoline Fuel Tank', 'Parcel Shelf', 'Torsion Beam Rear Suspension', 'Rear Seats'],
  },
  rollover: {
    primary: ['Windshield', 'T-Cross Hood', 'Left Mirror', 'Right Mirror'],
    secondary: ['Front Left Door Glass', 'Front Right Door Glass', 'Rear Left Door Glass', 'Rear Right Door Glass', 'Tailgate Glass', 'Interior', 'Front Left Fender', 'Front Right Fender'],
  },
}

function generateSimulationParts(scenarioId: string, speed: number) {
  const pool = SCENARIO_PARTS[scenarioId] || SCENARIO_PARTS.frontal
  const speedFactor = Math.min(speed / 100, 1)

  // Always include primary parts
  const parts = [...pool.primary]

  // Add secondary parts based on speed (higher speed = more parts)
  const secondaryCount = Math.max(1, Math.floor(pool.secondary.length * speedFactor))
  const shuffled = [...pool.secondary].sort(() => Math.random() - 0.5)
  parts.push(...shuffled.slice(0, secondaryCount))

  // Generate damage levels per part (higher speed = more damage)
  const partDamage: Record<string, number> = {}
  const partsArray: Array<{ name: string; partId: string; damage: number }> = []

  for (const name of parts) {
    const baseDamage = 0.3 + speedFactor * 0.5
    const variation = (Math.random() - 0.5) * 0.3
    const damage = parseFloat(Math.min(Math.max(baseDamage + variation, 0.1), 1.0).toFixed(2))
    const partId = name.toLowerCase().replace(/[\s-]+/g, '_')
    // Key part_damage by both name and partId so AnalysisPage can look up by broken_parts name
    partDamage[name] = damage
    partDamage[partId] = damage
    partsArray.push({ name, partId, damage })
  }

  return {
    broken_parts: parts,
    part_damage: partDamage,
    parts: partsArray,
    broken_parts_count: parts.length,
    damaged_parts_count: parts.length + Math.floor(Math.random() * 3),
    total_parts_count: 51,
  }
}

// Crash item interface
interface CrashItem {
  id?: string
  crash_id: string
  received_at: string
  vehicle: { id: number; name: string; model: string; brand: string }
  velocity: { speed_kmh: number }
  damage: {
    total_damage: number
    broken_parts_count: number
    broken_parts: string[]
    parts?: Array<{ name: string; partId: string; damage: number }>
    part_damage?: Record<string, number>
  }
}

// Crash scenarios for simulation modal
const CRASH_SCENARIOS = [
  { id: 'frontal', name: 'Colisão Frontal', icon: Target, speed: 50, angle: 0 },
  { id: 'side', name: 'Colisão Lateral', icon: Target, speed: 40, angle: 90 },
  { id: 'rear', name: 'Colisão Traseira', icon: Target, speed: 30, angle: 180 },
  { id: 'rollover', name: 'Capotamento', icon: Target, speed: 60, angle: 45 },
]

export function ResultsPage() {
  const navigate = useNavigate()
  const { selectedVehicle, setSelectedVehicle, setCurrentScreen } = useAppStore()

  // Redirect to /home if no vehicle selected
  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/home', { replace: true })
    }
  }, [selectedVehicle, navigate])

  const handleChangeVehicle = () => {
    sessionStorage.removeItem('vw_results_mode')
    setSelectedVehicle(undefined)
    setCurrentScreen('landing')
    navigate('/home')
  }

  // null = mode selection screen, 'beamng' | 'simulation' = collision list
  const [mode, setMode] = useState<'beamng' | 'simulation' | null>(() => {
    const stored = sessionStorage.getItem('vw_results_mode')
    return stored === 'beamng' || stored === 'simulation' ? stored : null
  })

  const [search, setSearch] = useState('')
  const [crashes, setCrashes] = useState<CrashItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSimModal, setShowSimModal] = useState(false)

  // Simulation modal state
  const [simScenario, setSimScenario] = useState(CRASH_SCENARIOS[0])
  const [simSpeed, setSimSpeed] = useState(50)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simProgress, setSimProgress] = useState(0)

  // Fetch parts for pricing
  const { data: allParts = [] } = useQuery({
    queryKey: ['parts-all'],
    queryFn: () => partService.list({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch crashes
  const fetchCrashes = async (silent = false) => {
    try {
      if (!silent) { setIsLoading(true); setError(null) }
      const history = await beamngService.getCrashHistory(50, 0)
      setCrashes(history.crashes?.length > 0 ? history.crashes : [])
    } catch (err) {
      console.error('Failed to fetch crashes:', err)
      if (!silent) setError('Erro ao buscar sinistros.')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  // Initial fetch + poll every 5s for new BeamNG crashes
  useEffect(() => {
    fetchCrashes()
    const interval = setInterval(() => fetchCrashes(true), 5000)
    return () => clearInterval(interval)
  }, [])

  const refreshCrashes = async () => {
    await fetchCrashes()
    toast.success('Lista atualizada!')
  }

  const deleteCrash = async (crashId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await beamngService.deleteCrash(crashId)
      setCrashes(prev => prev.filter(c => c.crash_id !== crashId))
      toast.success('Sinistro removido')
    } catch {
      toast.error('Erro ao remover sinistro')
    }
  }

  // Filter
  const filtered = crashes.filter(c =>
    c.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicle?.brand?.toLowerCase().includes(search.toLowerCase()) ||
    c.crash_id?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectBeamNG = () => {
    sessionStorage.setItem('vw_results_mode', 'beamng')
    setMode('beamng')
  }

  const handleSelectSimulation = () => {
    sessionStorage.setItem('vw_results_mode', 'simulation')
    setMode('simulation')
    setShowSimModal(true)
  }

  // Stats
  const totalCrashes = crashes.length
  const getCrashSeverity = (c: CrashItem) =>
    isUnibodyTotalled(c.damage) ? 'total_loss' : getSeverityFromDamage(computeTotalDamage(c.damage))
  const severeCount = crashes.filter(c => { const s = getCrashSeverity(c); return s === 'severe' || s === 'total_loss' }).length

  // Run demo simulation
  const runSimulation = async () => {
    if (!selectedVehicle) {
      toast.error('Selecione um veículo primeiro')
      return
    }

    setIsSimulating(true)
    setSimProgress(0)

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 250))
      setSimProgress(i)
    }

    const simParts = generateSimulationParts(simScenario.id, simSpeed)

    const crashEvent: CrashEventSubmission = {
      event_type: 'simulation',
      timestamp: Math.floor(Date.now() / 1000),
      timestamp_iso: new Date().toISOString(),
      vehicle: {
        id: selectedVehicle.id,
        name: selectedVehicle.model,
        model: selectedVehicle.model,
        brand: selectedVehicle.make || 'Volkswagen',
        year: selectedVehicle.year,
      },
      position: { x: 0, y: 0, z: 0 },
      velocity: {
        x: simSpeed * 0.277, y: 0, z: 0,
        speed_ms: simSpeed * 0.277,
        speed_kmh: simSpeed,
        speed_mph: simSpeed * 0.621,
      },
      damage: {
        total_damage: simParts.parts.reduce((s, p) => s + p.damage, 0) / TOTAL_VEHICLE_PARTS,
        previous_damage: 0,
        damage_delta: simParts.parts.reduce((s, p) => s + p.damage, 0) / TOTAL_VEHICLE_PARTS,
        part_damage: simParts.part_damage,
        damage_by_zone: {
          front: simScenario.angle === 0 ? 0.8 : 0.2,
          rear: simScenario.angle === 180 ? 0.8 : 0.1,
          left: simScenario.angle === 90 ? 0.7 : 0.15,
          right: 0.1, top: simScenario.id === 'rollover' ? 0.6 : 0.05, bottom: 0.1,
        },
        broken_parts: simParts.broken_parts,
        broken_parts_count: simParts.broken_parts_count,
        damaged_parts_count: simParts.damaged_parts_count,
        total_parts_count: simParts.total_parts_count,
        parts: simParts.parts,
      },
      metadata: {
        mod_version: '1.0.0-sim',
        beamng_version: 'simulation',
        damage_threshold: 0.1,
      },
    }

    try {
      await beamngService.submitCrashEvent(crashEvent)
      toast.success('Simulação concluída!')
      setIsSimulating(false)
      setShowSimModal(false)
      setSimProgress(0)
      await fetchCrashes()
    } catch (err) {
      console.error('Simulation error:', err)
      toast.error('Erro na simulação')
      setIsSimulating(false)
      setSimProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-6">
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Sinistros
            </h1>
            <p className="text-blue-200 mt-2">
              {selectedVehicle
                ? <>{selectedVehicle.make || 'Volkswagen'} {selectedVehicle.model} ({selectedVehicle.year}) &middot; <button onClick={handleChangeVehicle} className="underline hover:text-white transition-colors">Trocar veículo</button></>
                : 'Colisões registradas pelo BeamNG e simulações'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* MODE SELECTION */}
        {!mode && (
          <motion.div
            className="flex flex-col items-center justify-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-gray-500 mb-8 text-lg">Como deseja registrar colisões?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
              {/* BeamNG Card */}
              <motion.div
                className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white cursor-pointer hover:shadow-xl transition-all"
                onClick={handleSelectBeamNG}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
                    <Gamepad2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Dirigir no BeamNG</h3>
                  <p className="text-blue-200 text-sm leading-relaxed">
                    Conecte-se ao BeamNG.drive e dirija o veículo. Colisões são detectadas automaticamente pelo mod.
                  </p>
                  <div className="flex items-center gap-2 text-xs bg-white/15 rounded-lg px-3 py-1.5 mt-4">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    Aguardando dados do BeamNG
                  </div>
                </div>
              </motion.div>

              {/* Simulation Card */}
              <motion.div
                className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 text-white cursor-pointer hover:shadow-xl transition-all"
                onClick={handleSelectSimulation}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Simular Colisão</h3>
                  <p className="text-orange-100 text-sm leading-relaxed">
                    Crie uma simulação de colisão escolhendo o cenário e velocidade de impacto.
                  </p>
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 text-sm font-medium mt-4">
                    <Play className="h-4 w-4" />
                    Nova Simulação
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* COLLISION LIST (after mode selection) */}
        {mode && (
          <>
            {/* Back + action bar */}
            <motion.div
              className="flex items-center justify-end mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                {mode === 'beamng' && (
                  <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    BeamNG Ativo
                  </div>
                )}
                <button
                  onClick={() => setShowSimModal(true)}
                  className="vw-button-primary flex items-center gap-2 text-sm"
                >
                  <Zap className="h-4 w-4" />
                  Nova Simulação
                </button>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Car className="h-4 w-4" /> Total de Sinistros
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalCrashes}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" /> Severos
                </div>
                <p className="text-2xl font-bold text-orange-600">{severeCount}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <DollarSign className="h-4 w-4" /> Custo Médio
                </div>
                <p className="text-2xl font-bold text-vw-blue">
                  {crashes.length > 0
                    ? formatBRL(crashes.reduce((sum, c) => sum + calculateCrashCost(c.damage, allParts).total, 0) / crashes.length)
                    : 'R$ 0,00'}
                </p>
              </div>
            </motion.div>

            {/* Search + Refresh */}
            <motion.div
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por veículo, marca ou ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                />
              </div>
              <button onClick={refreshCrashes} className="p-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors" title="Atualizar">
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
            </motion.div>

            {/* Crash List */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-sm font-medium text-gray-500">
                <div className="col-span-3">Veículo</div>
                <div className="col-span-2">Severidade</div>
                <div className="col-span-3">Data</div>
                <div className="col-span-1">Peças</div>
                <div className="col-span-2">Reparo</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-vw-blue animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-500">{error}</p>
                  <button onClick={refreshCrashes} className="mt-3 text-vw-blue hover:underline text-sm">Tentar novamente</button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum sinistro encontrado</p>
                  <p className="text-gray-400 text-sm mt-1">Dirija no BeamNG ou crie uma simulação para gerar colisões</p>
                </div>
              ) : (
                filtered.map((crash) => {
                  const severity = getCrashSeverity(crash)
                  const cost = calculateCrashCost(crash.damage, allParts)
                  return (
                    <motion.div
                      key={crash.crash_id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b hover:bg-gray-50 transition-colors items-center cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => navigate(`/results/${crash.id}`, { state: { crash } })}
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center flex-shrink-0">
                          <Car className="h-5 w-5 text-white" />
                        </div>
                        <p className="font-medium text-gray-900 truncate">{crash.vehicle ? `${crash.vehicle.brand} ${crash.vehicle.name}` : 'Veículo'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs rounded-full font-medium ${severityColors[severity]}`}>
                          {(severity === 'severe' || severity === 'total_loss') && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {severityLabels[severity]}
                        </span>
                      </div>
                      <div className="col-span-3 text-sm text-gray-600 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>{formatDateOnly(crash.received_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>{formatTimeOnly(crash.received_at)}</span>
                        </div>
                      </div>
                      <div className="col-span-1 text-sm text-gray-600">
                        {crash.damage.parts?.length || crash.damage.broken_parts?.length || 0}
                      </div>
                      <div className="col-span-2 font-semibold text-vw-blue">
                        {formatBRL(cost.total)}
                      </div>
                      <div className="col-span-1 flex justify-end items-center gap-1">
                        <button
                          onClick={(e) => deleteCrash(crash.crash_id, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remover sinistro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Simulation Modal */}
      <AnimatePresence>
        {showSimModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Nova Simulação de Colisão
                </h2>
                <button onClick={() => setShowSimModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Car className="h-4 w-4 inline mr-1" /> Veículo
                  </label>
                  <div className="p-3 border-2 border-vw-blue bg-blue-50 rounded-lg">
                    <p className="font-medium text-sm">{selectedVehicle?.make || 'Volkswagen'} {selectedVehicle?.model}</p>
                    <p className="text-xs text-gray-500">{selectedVehicle?.year} - {selectedVehicle?.vin?.slice(-6)}</p>
                  </div>
                </div>

                {/* Crash Scenario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Target className="h-4 w-4 inline mr-1" /> Tipo de Colisão
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CRASH_SCENARIOS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSimScenario(s); setSimSpeed(s.speed) }}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          simScenario.id === s.id ? 'border-vw-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <s.icon className={`h-6 w-6 mx-auto mb-1 ${simScenario.id === s.id ? 'text-vw-blue' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Gauge className="h-4 w-4 inline mr-1" /> Velocidade de Impacto
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="10" max="120" value={simSpeed}
                      onChange={e => setSimSpeed(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-vw-blue"
                    />
                    <div className="w-20 text-center">
                      <span className="text-2xl font-bold text-vw-blue">{simSpeed}</span>
                      <span className="text-gray-500 text-xs block">km/h</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>10 km/h</span><span>60 km/h</span><span>120 km/h</span>
                  </div>
                </div>

                {/* Simulation Progress */}
                {isSimulating && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div
                        className="bg-vw-blue h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${simProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500">
                      {simProgress < 50 ? 'Executando simulação...' : simProgress < 90 ? 'Analisando danos...' : 'Gerando relatório...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <button onClick={() => setShowSimModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  Cancelar
                </button>
                <button
                  onClick={runSimulation}
                  disabled={!selectedVehicle || isSimulating}
                  className="px-6 py-3 bg-vw-blue text-white rounded-lg font-semibold hover:bg-vw-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  {isSimulating ? 'Simulando...' : 'Iniciar Simulação'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
