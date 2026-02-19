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
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { beamngService, CrashEventSubmission } from '../services/beamngService'
import { vehicleService } from '../services/vehicleService'
import { partService } from '../services/partService'
import { Vehicle, Part } from '../types'

// Labor rate per hour (R$/h)
const LABOR_RATE_BRL = 150

// Format currency in BRL
const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Format date in BRT
const formatDate = (dateString: string) => {
  const normalized =
    dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
      ? dateString
      : dateString + 'Z'
  return new Date(normalized).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' BRT'
}

const severityColors: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  total_loss: 'bg-red-100 text-red-800',
}

const severityLabels: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  total_loss: 'Perda Total',
}

const getSeverityFromDamage = (totalDamage: number): string => {
  if (totalDamage >= 0.8) return 'total_loss'
  if (totalDamage >= 0.5) return 'severe'
  if (totalDamage >= 0.2) return 'moderate'
  return 'minor'
}

// BeamNG abbreviation expansions for part name matching
const BEAMNG_ABBREV: Record<string, string> = {
  f: 'front', r: 'rear', l: 'left', fl: 'front left',
  fr: 'front right', rl: 'rear left', rr: 'rear right',
  t: 'top', b: 'bottom',
}

function findMatchingPart(beamngName: string, allParts: Part[]): Part | undefined {
  const nameLower = beamngName.toLowerCase().trim()
  const exact = allParts.find(p => p.name.toLowerCase() === nameLower)
  if (exact) return exact
  const withoutPrefix = nameLower.replace(/^[a-z]+\d*_/, '')
  const rawTokens = withoutPrefix.split(/[_\s-]+/).filter(t => t.length > 0)
  const keywords: string[] = []
  for (const token of rawTokens) {
    const expanded = BEAMNG_ABBREV[token]
    if (expanded) keywords.push(...expanded.split(' '))
    else keywords.push(token)
  }
  if (keywords.length === 0) return undefined
  let bestMatch: Part | undefined
  let bestScore = 0
  for (const part of allParts) {
    const partWords = part.name.toLowerCase().split(/[\s-]+/)
    let score = 0
    for (const kw of keywords) {
      for (const pw of partWords) {
        if (pw === kw) { score += 2; break }
        if (pw.includes(kw) || kw.includes(pw)) { score += 1; break }
      }
    }
    if (score > bestScore) { bestScore = score; bestMatch = part }
  }
  return bestScore >= 2 ? bestMatch : undefined
}

function calculateCrashCost(brokenParts: string[], allParts: Part[]) {
  let partsCost = 0
  let totalLaborHours = 0
  for (const name of brokenParts) {
    const dbPart = findMatchingPart(name, allParts)
    if (dbPart) {
      partsCost += parseFloat(dbPart.price_brl) || 0
      totalLaborHours += parseFloat(dbPart.labor_hours || '0') || 0
    }
  }
  const laborCost = totalLaborHours * LABOR_RATE_BRL
  return { partsCost, laborCost, total: partsCost + laborCost }
}

// Crash item interface
interface CrashItem {
  crash_id: string
  received_at: string
  vehicle: { id: number; name: string; model: string; brand: string }
  velocity: { speed_kmh: number }
  damage: {
    total_damage: number
    broken_parts_count: number
    broken_parts: string[]
    part_damage?: Record<string, number>
  }
}

// Crash scenarios for simulation modal
const CRASH_SCENARIOS = [
  { id: 'frontal', name: 'Colisao Frontal', icon: Target, speed: 50, angle: 0 },
  { id: 'side', name: 'Colisao Lateral', icon: Target, speed: 40, angle: 90 },
  { id: 'rear', name: 'Colisao Traseira', icon: Target, speed: 30, angle: 180 },
  { id: 'rollover', name: 'Capotamento', icon: Target, speed: 60, angle: 45 },
]

export function ResultsPage() {
  const navigate = useNavigate()
  const { selectedVehicle, setSelectedVehicle, setCurrentScreen } = useAppStore()

  const handleChangeVehicle = () => {
    setSelectedVehicle(undefined)
    setCurrentScreen('landing')
    navigate('/home')
  }

  const [search, setSearch] = useState('')
  const [crashes, setCrashes] = useState<CrashItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSimModal, setShowSimModal] = useState(false)

  // Simulation modal state
  const [simVehicle, setSimVehicle] = useState<Vehicle | undefined>(selectedVehicle)
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

  // Fetch vehicles for simulation modal
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 50 }),
  })

  // Fetch crashes
  useEffect(() => { fetchCrashes() }, [])

  const fetchCrashes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const history = await beamngService.getCrashHistory(50, 0)
      setCrashes(history.crashes?.length > 0 ? history.crashes : [])
    } catch (err) {
      console.error('Failed to fetch crashes:', err)
      setError('Erro ao buscar sinistros.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCrashes = async () => {
    await fetchCrashes()
    toast.success('Lista atualizada!')
  }

  // Filter
  const filtered = crashes.filter(c =>
    c.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicle?.brand?.toLowerCase().includes(search.toLowerCase()) ||
    c.crash_id?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const totalCrashes = crashes.length
  const severeCount = crashes.filter(c => getSeverityFromDamage(c.damage.total_damage) === 'severe' || getSeverityFromDamage(c.damage.total_damage) === 'total_loss').length

  // Run demo simulation
  const runSimulation = async () => {
    if (!simVehicle) {
      toast.error('Selecione um veiculo primeiro')
      return
    }

    setIsSimulating(true)
    setSimProgress(0)

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 250))
      setSimProgress(i)
    }

    const crashEvent: CrashEventSubmission = {
      event_type: 'simulation',
      timestamp: Date.now() / 1000,
      timestamp_iso: new Date().toISOString(),
      vehicle: {
        id: simVehicle.id,
        name: `VW ${simVehicle.model}`,
        model: simVehicle.model,
        brand: simVehicle.make || 'Volkswagen',
        year: simVehicle.year,
      },
      position: { x: 0, y: 0, z: 0 },
      velocity: {
        x: simSpeed * 0.277, y: 0, z: 0,
        speed_ms: simSpeed * 0.277,
        speed_kmh: simSpeed,
        speed_mph: simSpeed * 0.621,
      },
      damage: {
        total_damage: Math.min(simSpeed / 120, 0.95),
        previous_damage: 0,
        damage_delta: Math.min(simSpeed / 120, 0.95),
        part_damage: {
          front_bumper: Math.random() * 0.8 + 0.2,
          hood: Math.random() * 0.6,
          left_headlight: Math.random() * 0.7,
          left_fender: Math.random() * 0.5,
        },
        damage_by_zone: {
          front: simScenario.angle === 0 ? 0.8 : 0.2,
          rear: simScenario.angle === 180 ? 0.8 : 0.1,
          left: simScenario.angle === 90 ? 0.7 : 0.15,
          right: 0.1, top: simScenario.id === 'rollover' ? 0.6 : 0.05, bottom: 0.1,
        },
        broken_parts: ['front_bumper', 'hood', 'left_headlight', 'left_fender'],
        broken_parts_count: 4,
        damaged_parts_count: 6,
        total_parts_count: 51,
        parts: [
          { name: 'front_bumper', partId: 'fb1', damage: 0.8 },
          { name: 'hood', partId: 'h1', damage: 0.5 },
          { name: 'left_headlight', partId: 'lh1', damage: 0.9 },
          { name: 'left_fender', partId: 'lf1', damage: 0.4 },
        ],
      },
      metadata: {
        mod_version: '1.0.0-sim',
        beamng_version: 'simulation',
        damage_threshold: 0.1,
      },
    }

    try {
      await beamngService.submitCrashEvent(crashEvent)
      toast.success('Simulacao concluida!')
      setIsSimulating(false)
      setShowSimModal(false)
      setSimProgress(0)
      await fetchCrashes()
    } catch (err) {
      console.error('Simulation error:', err)
      toast.error('Erro na simulacao')
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
                ? <>VW {selectedVehicle.model} ({selectedVehicle.year}) &middot; <button onClick={handleChangeVehicle} className="underline hover:text-white transition-colors">Trocar veiculo</button></>
                : 'Colisoes registradas pelo BeamNG e simulacoes'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Action Cards: BeamNG or Simulate */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="h-6 w-6" />
              <h3 className="text-lg font-bold">Dirigir no BeamNG</h3>
            </div>
            <p className="text-blue-200 text-sm mb-4">
              Conecte-se ao BeamNG.drive e dirija o veiculo. Colisoes sao detectadas automaticamente pelo mod.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs bg-white/15 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Aguardando dados do BeamNG
              </div>
              <button onClick={refreshCrashes} className="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors">
                Atualizar lista
              </button>
            </div>
          </div>

          <div
            className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-all"
            onClick={() => { setSimVehicle(selectedVehicle); setShowSimModal(true) }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6" />
              <h3 className="text-lg font-bold">Simular Colisao</h3>
            </div>
            <p className="text-orange-100 text-sm mb-4">
              Crie uma simulacao de colisao escolhendo o cenario e velocidade de impacto.
            </p>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              <Play className="h-4 w-4" />
              Nova Simulacao
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
              <DollarSign className="h-4 w-4" /> Custo Medio
            </div>
            <p className="text-2xl font-bold text-vw-blue">
              {crashes.length > 0
                ? formatBRL(crashes.reduce((sum, c) => sum + calculateCrashCost(c.damage.broken_parts || [], allParts).total, 0) / crashes.length)
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
              placeholder="Buscar por veiculo, marca ou ID..."
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
            <div className="col-span-3">Veiculo</div>
            <div className="col-span-2">Severidade</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Pecas</div>
            <div className="col-span-2">Valor Manutencao</div>
            <div className="col-span-2 text-right">Acoes</div>
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
              <p className="text-gray-400 text-sm mt-1">Dirija no BeamNG ou crie uma simulacao para gerar colisoes</p>
            </div>
          ) : (
            filtered.map((crash) => {
              const severity = getSeverityFromDamage(crash.damage.total_damage)
              const cost = calculateCrashCost(crash.damage.broken_parts || [], allParts)
              return (
                <motion.div
                  key={crash.crash_id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b hover:bg-gray-50 transition-colors items-center cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => navigate('/damage-reports', { state: { crashId: crash.crash_id } })}
                >
                  <div className="col-span-3">
                    <p className="font-medium text-gray-900">{crash.vehicle?.name || 'Veiculo'}</p>
                    <p className="text-xs text-gray-500">{crash.velocity?.speed_kmh?.toFixed(0) || '0'} km/h</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${severityColors[severity]}`}>
                      {severityLabels[severity]}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    {formatDate(crash.received_at)}
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {crash.damage.broken_parts_count || 0}
                  </div>
                  <div className="col-span-2 font-semibold text-vw-blue">
                    {formatBRL(cost.total)}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
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
                  Nova Simulacao de Colisao
                </h2>
                <button onClick={() => setShowSimModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Car className="h-4 w-4 inline mr-1" /> Veiculo
                  </label>
                  {(Array.isArray(vehicles) ? vehicles : []).length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum veiculo cadastrado. <button onClick={() => navigate('/vehicles')} className="text-vw-blue hover:underline">Cadastrar</button></p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {(Array.isArray(vehicles) ? vehicles : []).map((v: Vehicle) => (
                        <button
                          key={v.id}
                          onClick={() => setSimVehicle(v)}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            simVehicle?.id === v.id ? 'border-vw-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium text-sm">VW {v.model}</p>
                          <p className="text-xs text-gray-500">{v.year} - {v.vin?.slice(-6)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Crash Scenario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Target className="h-4 w-4 inline mr-1" /> Tipo de Colisao
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
                      {simProgress < 50 ? 'Executando simulacao...' : simProgress < 90 ? 'Analisando danos...' : 'Gerando relatorio...'}
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
                  disabled={!simVehicle || isSimulating}
                  className="px-6 py-3 bg-vw-blue text-white rounded-lg font-semibold hover:bg-vw-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  {isSimulating ? 'Simulando...' : 'Iniciar Simulacao'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
