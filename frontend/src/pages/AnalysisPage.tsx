import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Car,
  Clock,
  DollarSign,
  Gauge,
  Calendar,
  Wrench,
  BarChart3,
  Check,
  MessageCircle,
  X,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { partService } from '../services/partService'
import { customerService, Customer } from '../services/customerService'
import { dealerService } from '../services/dealerService'
import { whatsappService } from '../services/whatsappService'
import { Part } from '../types'

// Labor rate per hour (R$/h)
const LABOR_RATE_BRL = 150

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
  minor: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  severe: 'bg-orange-100 text-orange-800 border-orange-200',
  total_loss: 'bg-red-100 text-red-800 border-red-200',
}

const severityLabels: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  total_loss: 'Perda Total',
}

// Total parts in the vehicle (from VEHICLE_PARTS.csv)
const TOTAL_VEHICLE_PARTS = 51

const getSeverityFromDamage = (totalDamage: number): string => {
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

// Crash item from route state
interface CrashPartDetail {
  name: string
  partId: string
  damage: number
}

interface CrashData {
  crash_id: string
  received_at: string
  vehicle: { id: number; name: string; model: string; brand: string }
  velocity: { speed_kmh: number }
  damage: {
    total_damage: number
    broken_parts_count: number
    broken_parts: string[]
    parts?: CrashPartDetail[]
    part_damage?: Record<string, number>
  }
}

export function AnalysisPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedVehicle } = useAppStore()
  const crash = (location.state as { crash?: CrashData })?.crash

  // Replace/repair toggle per part: damage >= 50% defaults to replace (checked)
  const [replaceParts, setReplaceParts] = useState<Record<string, boolean>>(() => {
    if (!crash?.damage) return {}
    const parts = crash.damage.parts?.length
      ? crash.damage.parts
      : (crash.damage.broken_parts || []).map(name => ({
          name, partId: name, damage: crash.damage.part_damage?.[name] ?? 0,
        }))
    const initial: Record<string, boolean> = {}
    parts.forEach(p => { initial[p.name] = p.damage >= 0.5 })
    return initial
  })

  const [showWppModal, setShowWppModal] = useState(false)
  const [wppCustomer, setWppCustomer] = useState<Customer | null>(null)
  const [wppDealerName, setWppDealerName] = useState('')
  const [sendingWpp, setSendingWpp] = useState(false)
  const [loadingWppData, setLoadingWppData] = useState(false)

  const toggleReplace = (partName: string) => {
    setReplaceParts(prev => ({ ...prev, [partName]: !prev[partName] }))
  }

  // Redirect if no crash data
  useEffect(() => {
    if (!crash) {
      navigate('/results', { replace: true })
    }
  }, [crash, navigate])

  // Fetch parts for pricing
  const { data: allParts = [] } = useQuery({
    queryKey: ['parts-all'],
    queryFn: () => partService.list({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  })

  if (!crash) return null

  // Use full parts array (all damaged parts) when available, fall back to broken_parts names
  const crashParts: Array<{ name: string; damage: number }> = crash.damage.parts?.length
    ? crash.damage.parts.map(p => ({ name: p.name, damage: p.damage }))
    : (crash.damage.broken_parts || []).map(name => ({
        name,
        damage: crash.damage.part_damage?.[name] ?? 0,
      }))

  // Compute real total damage: sum of part damages / total vehicle parts
  const realTotalDamage = crashParts.reduce((s, p) => s + p.damage, 0) / TOTAL_VEHICLE_PARTS

  // Check if Unibody damage > 40% → car is totalled
  const unibodyTotalled = crashParts.some(p => p.name.toLowerCase() === 'unibody' && p.damage > 0.4)
  const severity = unibodyTotalled ? 'total_loss' : getSeverityFromDamage(realTotalDamage)

  // Build detailed parts list with pricing
  // Replace (>= 50%): full price | Repair 20-49%: 50% price | Repair < 20%: 25% price
  const partsDetail = crashParts.map(({ name: partName, damage: damageLevel }) => {
    const dbPart = findMatchingPart(partName, allParts)
    const partSeverity = getSeverityFromDamage(damageLevel)
    const fullPrice = dbPart ? parseFloat(dbPart.price_brl) || 0 : 0
    const fullLaborHours = dbPart ? parseFloat(dbPart.labor_hours || '0') || 0 : 0
    const isReplace = replaceParts[partName] ?? (damageLevel >= 0.5)
    const repairFactor = damageLevel < 0.2 ? 0.25 : 0.5
    return {
      name: partName,
      damageLevel,
      severity: partSeverity,
      fullPrice,
      price: isReplace ? fullPrice : fullPrice * repairFactor,
      repairFactor,
      laborHours: fullLaborHours,
      matched: !!dbPart,
      namePt: dbPart?.name_pt || dbPart?.name,
      isReplace,
    }
  })

  const replaceCount = partsDetail.filter(p => p.isReplace).length
  const repairCount = partsDetail.length - replaceCount
  const totalPartsCost = partsDetail.reduce((s, p) => s + p.price, 0)
  const totalLaborHours = partsDetail.reduce((s, p) => s + p.laborHours, 0)
  const totalLaborCost = totalLaborHours * LABOR_RATE_BRL
  const totalCost = totalPartsCost + totalLaborCost

  const openWppModal = async () => {
    if (!selectedVehicle?.customer_id) {
      toast.error('Veículo não possui proprietário cadastrado')
      return
    }

    setShowWppModal(true)
    setWppCustomer(null)
    setWppDealerName('Caraigá - Volkswagen Morumbi')
    setLoadingWppData(true)
    try {
      const customer = await customerService.getById(selectedVehicle.customer_id)
      setWppCustomer(customer)

      if (customer.preferred_dealer_id) {
        try {
          const dealer = await dealerService.getById(customer.preferred_dealer_id)
          setWppDealerName(dealer.name)
        } catch {
          // keep default dealer name
        }
      }
    } catch {
      toast.error('Erro ao carregar dados do proprietário')
      setShowWppModal(false)
    } finally {
      setLoadingWppData(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!wppCustomer) return

    setSendingWpp(true)
    try {
      await whatsappService.sendCollisionWhatsApp({
        phone: wppCustomer.phone,
        repairPrice: formatBRL(totalCost),
        dealerName: wppDealerName,
        dealerAddress: 'Av. Ulysses Reis de Mattos, 100 - Real Parque, São Paulo - SP',
        dealerPhone: '(11) 3525-8000',
      })

      toast.success('Orçamento enviado via WhatsApp!')
      setShowWppModal(false)
    } catch {
      toast.error('Erro ao enviar mensagem via WhatsApp')
    } finally {
      setSendingWpp(false)
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
              <Activity className="h-8 w-8" />
              Análise de Colisão
            </h1>
            <p className="text-blue-200 mt-2">
              {crash.vehicle ? `${crash.vehicle.brand} ${crash.vehicle.name}` : 'Veículo'} &middot; {formatDate(crash.received_at)}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Back button */}
        <motion.button
          onClick={() => navigate('/results')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar para Sinistros
        </motion.button>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle + Crash Summary */}
            <motion.div
              className="bg-white rounded-xl p-6 shadow-sm border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-vw-blue rounded-xl flex items-center justify-center">
                  <Car className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{crash.vehicle ? `${crash.vehicle.brand} ${crash.vehicle.name}` : 'Veículo'}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedVehicle ? `${selectedVehicle.year} • VIN: ${selectedVehicle.vin}` : crash.vehicle?.brand}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Gauge className="h-3.5 w-3.5" /> Velocidade
                  </div>
                  <p className="text-lg font-bold text-gray-900">{crash.velocity?.speed_kmh?.toFixed(0) || '0'} km/h</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Dano Total
                  </div>
                  <p className="text-lg font-bold text-gray-900">{(realTotalDamage * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Wrench className="h-3.5 w-3.5" /> Peças Danificadas
                  </div>
                  <p className="text-lg font-bold text-gray-900">{crashParts.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Calendar className="h-3.5 w-3.5" /> Data
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatDate(crash.received_at)}</p>
                </div>
              </div>
            </motion.div>

            {/* Totalled Banner */}
            {unibodyTotalled && (
              <motion.div
                className="bg-red-600 text-white rounded-xl p-5 flex items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <AlertTriangle className="h-8 w-8 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold">Veículo com Perda Total</p>
                  <p className="text-red-200 text-sm">O monobloco apresenta dano superior a 40%, tornando o reparo inviável.</p>
                </div>
              </motion.div>
            )}

            {/* Damaged Parts Breakdown */}
            <motion.div
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-vw-blue" />
                  <h3 className="font-semibold text-gray-900">Peças Danificadas</h3>
                </div>
              </div>

              {partsDetail.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p>Nenhuma peça danificada registrada</p>
                </div>
              ) : (
                <div className="divide-y">
                  {partsDetail.map((part, index) => (
                    <motion.div
                      key={part.name}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Replace toggle (locked for damage >= 50%) */}
                          <button
                            onClick={() => part.damageLevel < 0.5 && toggleReplace(part.name)}
                            disabled={part.damageLevel >= 0.5}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              part.isReplace
                                ? 'bg-vw-blue border-vw-blue text-white'
                                : 'border-gray-300 hover:border-gray-400'
                            } ${part.damageLevel >= 0.5 ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={part.damageLevel >= 0.5 ? 'Substituição obrigatória (dano ≥ 50%)' : part.isReplace ? 'Substituir peça (clique para reparar)' : 'Reparar peça (clique para substituir)'}
                          >
                            {part.isReplace && <Check className="h-3 w-3" />}
                          </button>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                              {part.namePt || part.name.replace(/_/g, ' ')}
                            </p>
                            <p className={`text-xs mt-0.5 ${part.isReplace ? 'text-vw-blue' : 'text-amber-600'}`}>
                              {part.isReplace ? 'Substituir peça' : part.repairFactor <= 0.25 ? 'Reparo leve' : 'Reparo'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${severityColors[part.severity]}`}>
                            {severityLabels[part.severity]}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 w-28 text-right">
                            {part.price > 0 ? formatBRL(part.price) : '-'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Severity Card */}
            <motion.div
              className={`rounded-xl p-6 border ${severityColors[severity]}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-semibold">Severidade</h3>
              </div>
              <p className="text-3xl font-bold">{severityLabels[severity]}</p>
              <p className="text-sm mt-1 opacity-75">{(realTotalDamage * 100).toFixed(1)}% de dano total</p>
            </motion.div>

            {/* WhatsApp Button */}
            <motion.button
              onClick={openWppModal}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Orçamento via WhatsApp
            </motion.button>

            {/* Cost Breakdown */}
            <motion.div
              className="bg-white rounded-xl p-6 shadow-sm border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-vw-blue" />
                <h3 className="font-semibold text-gray-900">Orçamento</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Substituições ({replaceCount})</span>
                  <span className="font-semibold text-gray-900">
                    {formatBRL(partsDetail.filter(p => p.isReplace).reduce((s, p) => s + p.price, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-600 text-sm">Reparos ({repairCount})</span>
                  <span className="font-semibold text-amber-600">
                    {formatBRL(partsDetail.filter(p => !p.isReplace).reduce((s, p) => s + p.price, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Mão de Obra</span>
                  <span className="font-semibold text-gray-900">{formatBRL(totalLaborCost)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{totalLaborHours.toFixed(1)}h x {formatBRL(LABOR_RATE_BRL)}/h</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Estimado</span>
                    <span className="text-xl font-bold text-vw-blue">{formatBRL(totalCost)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="bg-white rounded-xl p-6 shadow-sm border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">Estatísticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Peças Danificadas</span>
                  <span className="text-lg font-bold text-gray-900">{crashParts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 text-sm">Severo / Perda Total</span>
                  <span className="text-lg font-bold text-red-600">
                    {partsDetail.filter(p => p.severity === 'severe' || p.severity === 'total_loss').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600 text-sm">Moderado</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {partsDetail.filter(p => p.severity === 'moderate').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-600 text-sm">Leve</span>
                  <span className="text-lg font-bold text-green-600">
                    {partsDetail.filter(p => p.severity === 'minor').length}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Time estimate */}
            <motion.div
              className="bg-vw-blue text-white rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5" />
                <h3 className="font-semibold">Tempo Estimado</h3>
              </div>
              <p className="text-3xl font-bold">{totalLaborHours.toFixed(1)}h</p>
              <p className="text-blue-200 text-sm mt-1">de mão de obra para reparo</p>
            </motion.div>

          </div>
        </div>
      </div>

      {/* WhatsApp Confirmation Modal */}
      {showWppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                Confirmar Envio via WhatsApp
              </h3>
              <button onClick={() => setShowWppModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              {loadingWppData ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : wppCustomer ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Proprietário</p>
                    <p className="font-medium text-gray-900">{wppCustomer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                    <p className="font-medium text-gray-900">{customerService.formatPhone(wppCustomer.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Concessionária</p>
                    <p className="font-medium text-gray-900">{wppDealerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Valor do Orçamento</p>
                    <p className="font-bold text-vw-blue text-lg">{formatBRL(totalCost)}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowWppModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={!wppCustomer || sendingWpp}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingWpp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {sendingWpp ? 'Enviando...' : 'Confirmar e Enviar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
