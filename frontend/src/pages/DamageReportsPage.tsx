import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Eye,
  Download,
  Car,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Loader2,
  ChevronRight,
  Calendar,
  Gauge,
  ArrowLeft
} from 'lucide-react'
import { beamngService } from '../services/beamngService'
import toast from 'react-hot-toast'

// Format currency in BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

// Get severity from damage percentage
const getSeverityFromDamage = (totalDamage: number): string => {
  if (totalDamage >= 0.8) return 'total_loss'
  if (totalDamage >= 0.5) return 'severe'
  if (totalDamage >= 0.2) return 'moderate'
  return 'minor'
}

// Crash item interface
interface CrashItem {
  crash_id: string
  received_at: string
  vehicle: {
    id: number
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
    part_damage?: Record<string, number>
  }
}

export function DamageReportsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [crashes, setCrashes] = useState<CrashItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCrash, setSelectedCrash] = useState<CrashItem | null>(null)

  // Fetch ALL crashes from API
  useEffect(() => {
    fetchCrashes()
  }, [])

  const fetchCrashes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const history = await beamngService.getCrashHistory(50, 0)
      if (history.crashes && history.crashes.length > 0) {
        setCrashes(history.crashes)
      } else {
        setCrashes([])
      }
    } catch (err) {
      console.error('Failed to fetch crashes:', err)
      setError('Erro ao buscar relatórios de sinistros.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCrashes = async () => {
    await fetchCrashes()
    toast.success('Relatórios atualizados!')
  }

  // Filter by search term
  const filteredCrashes = crashes.filter(crash =>
    crash.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
    crash.vehicle?.brand?.toLowerCase().includes(search.toLowerCase()) ||
    crash.crash_id?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const totalReports = crashes.length
  const severeCount = crashes.filter(c => getSeverityFromDamage(c.damage.total_damage) === 'severe' || getSeverityFromDamage(c.damage.total_damage) === 'total_loss').length
  const totalDamageValue = crashes.reduce((sum, c) => {
    const partsCount = c.damage.broken_parts_count || 0
    return sum + (partsCount * 300) // Estimate R$300 per broken part
  }, 0)
  const uniqueVehicles = new Set(crashes.map(c => c.vehicle?.name)).size

  const viewCrashDetails = async (crash: CrashItem) => {
    try {
      const fullCrash = await beamngService.getCrashById(crash.crash_id)
      setSelectedCrash(fullCrash as CrashItem)
    } catch (err) {
      setSelectedCrash(crash)
    }
  }

  const backToList = () => setSelectedCrash(null)

  // Detail view
  if (selectedCrash) {
    const severity = getSeverityFromDamage(selectedCrash.damage.total_damage)
    const partDamage = selectedCrash.damage.part_damage || {}
    const damagedParts = Object.entries(partDamage)
      .filter(([_, dmg]) => dmg > 0.01)
      .sort(([_, a], [__, b]) => b - a)

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Header */}
        <div className={`py-6 ${severity === 'total_loss' ? 'bg-red-600' : severity === 'severe' ? 'bg-orange-600' : severity === 'moderate' ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>
          <div className="vw-container">
            <button
              onClick={backToList}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para lista
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <FileText className="h-7 w-7" />
              Detalhes do Sinistro
            </h1>
            <p className="text-white/80 mt-1">
              ID: {selectedCrash.crash_id}
            </p>
          </div>
        </div>

        <div className="vw-container py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedCrash.vehicle?.brand} {selectedCrash.vehicle?.name}</p>
                  <p className="text-sm text-gray-500">Veículo</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${severityColors[severity].split(' ')[0]} rounded-lg flex items-center justify-center`}>
                  <AlertTriangle className={`h-5 w-5 ${severityColors[severity].split(' ')[1]}`} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{(selectedCrash.damage.total_damage * 100).toFixed(0)}%</p>
                  <p className="text-sm text-gray-500">{severityLabels[severity]}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedCrash.velocity?.speed_kmh?.toFixed(0) || 0} km/h</p>
                  <p className="text-sm text-gray-500">Velocidade</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{formatDate(selectedCrash.received_at)}</p>
                  <p className="text-sm text-gray-500">Data</p>
                </div>
              </div>
            </div>
          </div>

          {/* Broken Parts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Peças Danificadas ({selectedCrash.damage.broken_parts_count})
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedCrash.damage.broken_parts?.map((part, index) => (
                <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {part}
                </span>
              ))}
            </div>
          </div>

          {/* Part Damage Details */}
          {damagedParts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Detalhamento de Danos
              </h2>
              <div className="space-y-3">
                {damagedParts.slice(0, 15).map(([partName, damage], index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{partName}</p>
                    </div>
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${damage >= 0.8 ? 'bg-red-500' : damage >= 0.5 ? 'bg-orange-500' : damage >= 0.2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${damage * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-16 text-right ${damage >= 0.8 ? 'text-red-600' : damage >= 0.5 ? 'text-orange-600' : damage >= 0.2 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {(damage * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                {damagedParts.length > 15 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... e mais {damagedParts.length - 15} peças
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-vw-blue mx-auto mb-4" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Relatórios de Sinistros
            </h1>
            <p className="text-blue-200 mt-2">
              Todos os sinistros registrados de todos os veículos
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
                <p className="text-sm text-gray-500">Total de Sinistros</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{severeCount}</p>
                <p className="text-sm text-gray-500">Severos / Perda Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{uniqueVehicles}</p>
                <p className="text-sm text-gray-500">Veículos Únicos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatBRL(totalDamageValue)}</p>
                <p className="text-sm text-gray-500">Estimativa Total</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions Bar */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por veículo ou ID do sinistro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshCrashes}
            className="vw-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Atualizar
          </button>
        </motion.div>

        {/* Reports List */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
              <div className="col-span-3">Veículo</div>
              <div className="col-span-2">Severidade</div>
              <div className="col-span-2">Dano Total</div>
              <div className="col-span-2">Peças Danificadas</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredCrashes.length === 0 ? (
              <div className="px-6 py-16 text-center">
                {crashes.length === 0 ? (
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Car className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Nenhum sinistro ainda</h3>
                    <p className="text-lg text-gray-500 mb-2">🚗 Ainda dirigindo por aí...</p>
                    <p className="text-sm text-gray-400">Os sinistros aparecerão aqui automaticamente quando detectados pelo simulador BeamNG.drive</p>
                  </div>
                ) : (
                  <div>
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum resultado encontrado para sua busca</p>
                  </div>
                )}
              </div>
            ) : (
              filteredCrashes.map((crash, index) => {
                const severity = getSeverityFromDamage(crash.damage.total_damage)
                return (
                  <motion.div
                    key={crash.crash_id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => viewCrashDetails(crash)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Vehicle */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center">
                          <Car className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">
                            {crash.vehicle?.brand} {crash.vehicle?.name}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {crash.vehicle?.id}
                          </span>
                        </div>
                      </div>

                      {/* Severity */}
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[severity]}`}>
                          {(severity === 'severe' || severity === 'total_loss') && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {severityLabels[severity]}
                        </span>
                      </div>

                      {/* Total Damage */}
                      <div className="col-span-2">
                        <span className={`font-bold ${crash.damage.total_damage >= 0.8 ? 'text-red-600' : crash.damage.total_damage >= 0.5 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {(crash.damage.total_damage * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Broken Parts */}
                      <div className="col-span-2 text-gray-600">
                        {crash.damage.broken_parts_count} peças
                      </div>

                      {/* Date */}
                      <div className="col-span-2 text-sm text-gray-500">
                        {formatDate(crash.received_at)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Exibindo {filteredCrashes.length} de {crashes.length} sinistros
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
