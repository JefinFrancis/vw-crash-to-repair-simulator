import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
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
  ArrowLeft,
  Mail,
  FileCheck,
  Package
} from 'lucide-react'
import { beamngService } from '../services/beamngService'
import { partService } from '../services/partService'
import { Part } from '../types'
import toast from 'react-hot-toast'

// Labor rate per hour (R$/h) - typical VW dealer rate in Brazil
const LABOR_RATE_BRL = 150

// Format currency in BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format date in Brazilian format, always as BRT (UTC-3)
const formatDate = (dateString: string) => {
  const normalized = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
    ? dateString
    : dateString + 'Z'
  const date = new Date(normalized)
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

// BeamNG abbreviation expansions for part name matching
const BEAMNG_ABBREV: Record<string, string> = {
  'f': 'front', 'r': 'rear', 'l': 'left', 'fl': 'front left',
  'fr': 'front right', 'rl': 'rear left', 'rr': 'rear right',
  't': 'top', 'b': 'bottom',
}

/**
 * Match a BeamNG part name (e.g. "etk800_fender_FL") to a DB part.
 * Strategy:
 * 1. Exact match (case-insensitive)
 * 2. Keyword scoring: extract words from both names, count matches
 */
function findMatchingPart(beamngName: string, allParts: Part[]): Part | undefined {
  const nameLower = beamngName.toLowerCase().trim()

  // 1. Exact match by English name
  const exact = allParts.find(p => p.name.toLowerCase() === nameLower)
  if (exact) return exact

  // 2. Extract keywords from BeamNG name
  // Remove common model prefixes (e.g., "etk800_", "tcross_", "vivace_")
  const withoutPrefix = nameLower.replace(/^[a-z]+\d*_/, '')
  const rawTokens = withoutPrefix.split(/[_\s-]+/).filter(t => t.length > 0)

  // Expand abbreviations
  const beamngKeywords: string[] = []
  for (const token of rawTokens) {
    const expanded = BEAMNG_ABBREV[token]
    if (expanded) {
      beamngKeywords.push(...expanded.split(' '))
    } else {
      beamngKeywords.push(token)
    }
  }

  if (beamngKeywords.length === 0) return undefined

  // 3. Score each DB part
  let bestMatch: Part | undefined
  let bestScore = 0

  for (const part of allParts) {
    const partWords = part.name.toLowerCase().split(/[\s-]+/)
    let score = 0
    for (const kw of beamngKeywords) {
      for (const pw of partWords) {
        if (pw === kw) { score += 2; break }
        if (pw.includes(kw) || kw.includes(pw)) { score += 1; break }
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = part
    }
  }

  // Only return match if at least 2 points (one exact word match or two partial)
  return bestScore >= 2 ? bestMatch : undefined
}

// Resolved part info after DB lookup
interface ResolvedPart {
  beamng_name: string
  name_pt: string
  name_en: string
  price_brl: number
  labor_hours: number
  matched: boolean
  damage?: number
}

/**
 * Resolve a list of broken parts against the DB parts catalog.
 */
function resolveBrokenParts(
  brokenParts: string[],
  partDamage: Record<string, number>,
  allParts: Part[]
): ResolvedPart[] {
  const resolved: ResolvedPart[] = []
  const usedPartIds = new Set<string>()

  for (const partName of brokenParts) {
    const dbPart = findMatchingPart(partName, allParts)
    const damage = partDamage[partName] ?? undefined

    if (dbPart && !usedPartIds.has(dbPart.id)) {
      usedPartIds.add(dbPart.id)
      resolved.push({
        beamng_name: partName,
        name_pt: dbPart.name_pt || dbPart.name,
        name_en: dbPart.name,
        price_brl: parseFloat(dbPart.price_brl) || 0,
        labor_hours: parseFloat(dbPart.labor_hours || '0') || 0,
        matched: true,
        damage,
      })
    } else {
      resolved.push({
        beamng_name: partName,
        name_pt: partName,
        name_en: partName,
        price_brl: 0,
        labor_hours: 0,
        matched: false,
        damage,
      })
    }
  }

  return resolved
}

/**
 * Calculate crash maintenance cost from resolved parts.
 */
function calculateCrashCost(resolvedParts: ResolvedPart[]) {
  const partsCost = resolvedParts.reduce((sum, p) => sum + p.price_brl, 0)
  const totalLaborHours = resolvedParts.reduce((sum, p) => sum + p.labor_hours, 0)
  const laborCost = totalLaborHours * LABOR_RATE_BRL
  return { partsCost, laborCost, totalLaborHours, total: partsCost + laborCost }
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

  // Fetch all parts from DB for price/name lookups
  const { data: allParts = [] } = useQuery({
    queryKey: ['parts-all'],
    queryFn: () => partService.list({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  })

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

  // Calculate stats using DB prices
  const totalReports = crashes.length
  const severeCount = crashes.filter(c => {
    const s = getSeverityFromDamage(c.damage.total_damage)
    return s === 'severe' || s === 'total_loss'
  }).length
  const totalDamageValue = useMemo(() => {
    if (allParts.length === 0) return 0
    return crashes.reduce((sum, c) => {
      const resolved = resolveBrokenParts(
        c.damage.broken_parts || [],
        c.damage.part_damage || {},
        allParts
      )
      const { total } = calculateCrashCost(resolved)
      return sum + total
    }, 0)
  }, [crashes, allParts])
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

  // ============================================================================
  // DETAIL VIEW
  // ============================================================================
  if (selectedCrash) {
    const severity = getSeverityFromDamage(selectedCrash.damage.total_damage)
    const partDamage = selectedCrash.damage.part_damage || {}
    const brokenParts = selectedCrash.damage.broken_parts || []

    // If broken_parts is empty, fall back to part_damage keys with damage > 0.5
    const effectiveBrokenParts = brokenParts.length > 0
      ? brokenParts
      : Object.entries(partDamage)
          .filter(([_, dmg]) => dmg > 0.5)
          .sort(([_, a], [__, b]) => b - a)
          .map(([name]) => name)

    // Resolve parts against DB
    const resolvedParts = resolveBrokenParts(effectiveBrokenParts, partDamage, allParts)
    const { partsCost, laborCost, totalLaborHours, total } = calculateCrashCost(resolvedParts)
    const matchedCount = resolvedParts.filter(p => p.matched).length

    // Also show all parts with any damage from part_damage (for comprehensive view)
    const allDamagedParts = Object.entries(partDamage)
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
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="h-7 w-7" />
              Detalhes do Sinistro
            </h1>
            <p className="text-white/70 mt-1">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Damage details (2 cols) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Package className="h-5 w-5 text-vw-blue" />
                  Peças Danificadas ({resolvedParts.length})
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {matchedCount} de {resolvedParts.length} peças identificadas no catálogo
                </p>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-500 border-b border-gray-200 pb-2 mb-3">
                  <div className="col-span-1"></div>
                  <div className="col-span-5">Peça</div>
                  <div className="col-span-3">Severidade</div>
                  <div className="col-span-3 text-right">Valor</div>
                </div>
                <div className="space-y-1">
                  {resolvedParts.length > 0 ? (
                    resolvedParts.map((part, index) => {
                      const partSeverity = part.damage != null
                        ? (part.damage >= 0.8 ? 'total_loss' : part.damage >= 0.5 ? 'severe' : part.damage >= 0.2 ? 'moderate' : 'minor')
                        : severity
                      return (
                        <div key={index} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-50 last:border-0">
                          <div className="col-span-1">
                            {part.matched ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="col-span-5">
                            <p className="font-medium text-gray-900 text-sm">{part.name_pt}</p>
                            {part.matched && part.name_pt !== part.name_en && (
                              <p className="text-xs text-gray-400 italic">{part.name_en}</p>
                            )}
                            {!part.matched && (
                              <p className="text-xs text-amber-500">Não catalogada</p>
                            )}
                          </div>
                          <div className="col-span-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[partSeverity]}`}>
                              {severityLabels[partSeverity]}
                            </span>
                          </div>
                          <div className="col-span-3 text-right">
                            {part.matched ? (
                              <span className="font-semibold text-gray-900 text-sm">{formatBRL(part.price_brl)}</span>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma peça danificada identificada</p>
                    </div>
                  )}
                </div>

                {/* All parts with damage (from part_damage) */}
                {allDamagedParts.length > 0 && allDamagedParts.length !== resolvedParts.length && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                      Todos os componentes com dano ({allDamagedParts.length})
                    </h3>
                    <div className="space-y-1">
                      {allDamagedParts.slice(0, 20).map(([partName, damage], index) => {
                        const dbPart = findMatchingPart(partName, allParts)
                        const displayName = dbPart ? (dbPart.name_pt || dbPart.name) : partName
                        const partSeverity = damage >= 0.8 ? 'total_loss' : damage >= 0.5 ? 'severe' : damage >= 0.2 ? 'moderate' : 'minor'
                        return (
                          <div key={index} className="flex items-center justify-between py-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${damage >= 0.8 ? 'bg-red-500' : damage >= 0.5 ? 'bg-orange-500' : damage >= 0.2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(damage * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-gray-700">{displayName}</span>
                            </div>
                            <span className={`text-xs font-medium ${severityColors[partSeverity].split(' ')[1]}`}>
                              {(damage * 100).toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                      {allDamagedParts.length > 20 && (
                        <p className="text-xs text-gray-400 pt-2">
                          +{allDamagedParts.length - 20} componentes adicionais
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Maintenance cost summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-bold text-gray-900">Valor da Manutenção</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Estimativa baseada em {matchedCount} peças identificadas no catálogo VW.
                  {resolvedParts.length > matchedCount && (
                    <span className="text-amber-600"> {resolvedParts.length - matchedCount} peças não catalogadas.</span>
                  )}
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-700 mb-1">Custo estimado total</p>
                  <p className="text-3xl font-bold text-green-700">
                    {formatBRL(total)}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Peças ({matchedCount}x)</span>
                    <span className="font-medium">{formatBRL(partsCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mão de obra ({totalLaborHours.toFixed(1)}h)</span>
                    <span className="font-medium">{formatBRL(laborCost)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => toast.success('Agendamento em breve!')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-vw-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Agendar Manutenção
                  </button>
                  <button
                    onClick={() => toast.success('Lembrete enviado!')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar Lembrete
                  </button>
                </div>
              </div>
            </div>
          </div>
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

  // ============================================================================
  // LIST VIEW
  // ============================================================================
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
            className="vw-button-primary flex items-center gap-2"
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
              <div className="col-span-2">Veículo</div>
              <div className="col-span-2">Severidade</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-1">Peças</div>
              <div className="col-span-2">Valor Manutenção</div>
              <div className="col-span-3 text-right">Ações</div>
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
                    <p className="text-lg text-gray-500 mb-2">Ainda dirigindo por ai...</p>
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
                const crashSeverity = getSeverityFromDamage(crash.damage.total_damage)
                // Calculate real cost from DB
                const resolved = resolveBrokenParts(
                  crash.damage.broken_parts || [],
                  crash.damage.part_damage || {},
                  allParts
                )
                const { total: crashTotal } = calculateCrashCost(resolved)

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
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center flex-shrink-0">
                          <Car className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 block truncate">
                            {crash.vehicle?.brand} {crash.vehicle?.name}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {crash.vehicle?.id}
                          </span>
                        </div>
                      </div>

                      {/* Severity */}
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[crashSeverity]}`}>
                          {(crashSeverity === 'severe' || crashSeverity === 'total_loss') && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {severityLabels[crashSeverity]}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 text-sm text-gray-500">
                        {formatDate(crash.received_at)}
                      </div>

                      {/* Broken Parts */}
                      <div className="col-span-1 text-gray-600">
                        {crash.damage.broken_parts_count} peças
                      </div>

                      {/* Maintenance Cost - DB-driven */}
                      <div className="col-span-2">
                        <span className="font-bold text-green-700">
                          {crashTotal > 0 ? formatBRL(crashTotal) : '--'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toast.success('Agendamento em breve!') }}
                          className="p-1.5 rounded-md border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Agendar manutenção"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toast.success('Lembrete enviado!') }}
                          className="p-1.5 rounded-md border border-amber-200 bg-white hover:bg-amber-50 text-amber-600 transition-colors"
                          title="Enviar lembrete"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toast.success('Contrato aceito!') }}
                          className="p-1.5 rounded-md border border-green-200 bg-white hover:bg-green-50 text-green-600 transition-colors"
                          title="Aceite de contrato"
                        >
                          <FileCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); viewCrashDetails(crash) }}
                          className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 transition-colors"
                          title="Ver detalhes"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
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
