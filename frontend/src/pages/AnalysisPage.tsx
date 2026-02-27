import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Car,
  Clock,
  DollarSign,
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
import { beamngService } from '../services/beamngService'
import { customerService, Customer } from '../services/customerService'
import { dealerService } from '../services/dealerService'
import { whatsappService } from '../services/whatsappService'
import { appointmentService } from '../services/appointmentService'
import { Part } from '../types'
import {
  LABOR_RATE_BRL,
  TOTAL_VEHICLE_PARTS,
  severityColorsWithBorders as severityColors,
  severityLabels,
  getSeverityFromDamage,
  findMatchingPart,
  formatBRL,
} from '../utils/damageCalculations'

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

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
]

const generateAvailableDates = () => {
  const dates: Date[] = []
  const today = new Date()
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    if (date.getDay() !== 0) dates.push(date) // exclude Sundays
  }
  return dates
}

const inferPriority = (severity: string): 'normal' | 'high' | 'urgent' => {
  switch (severity) {
    case 'total_loss':
    case 'severe':
      return 'urgent'
    case 'moderate':
      return 'high'
    default:
      return 'normal'
  }
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
}

// Crash item from route state
interface CrashPartDetail {
  name: string
  partId: string
  damage: number
}

interface CrashData {
  id?: string
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
  const { id } = useParams<{ id: string }>()
  const { selectedVehicle } = useAppStore()
  const crashFromState = (location.state as { crash?: CrashData })?.crash

  const [fetchedCrash, setFetchedCrash] = useState<CrashData | null>(null)
  const [isLoadingCrash, setIsLoadingCrash] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Fetch crash from API if we have a UUID param but no route state
  useEffect(() => {
    if (!crashFromState && id) {
      setIsLoadingCrash(true)
      beamngService.getCrashByUuid(id)
        .then((data) => setFetchedCrash(data as CrashData))
        .catch(() => setLoadError(true))
        .finally(() => setIsLoadingCrash(false))
    }
  }, [id, crashFromState])

  const crash = crashFromState || fetchedCrash

  // Replace/repair toggle per part: damage >= 50% defaults to replace (checked)
  const [replaceParts, setReplaceParts] = useState<Record<string, boolean>>({})

  // Initialize replaceParts when crash data becomes available
  useEffect(() => {
    if (!crash?.damage) return
    const parts = crash.damage.parts?.length
      ? crash.damage.parts
      : (crash.damage.broken_parts || []).map(name => ({
          name, partId: name, damage: crash.damage.part_damage?.[name] ?? 0,
        }))
    const initial: Record<string, boolean> = {}
    parts.forEach(p => { initial[p.name] = p.damage >= 0.5 })
    setReplaceParts(initial)
  }, [crash])

  const [showWppModal, setShowWppModal] = useState(false)
  const [wppCustomer, setWppCustomer] = useState<Customer | null>(null)
  const [wppDealerName, setWppDealerName] = useState('')
  const [sendingWpp, setSendingWpp] = useState(false)
  const [loadingWppData, setLoadingWppData] = useState(false)

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [loadingAppointmentData, setLoadingAppointmentData] = useState(false)
  const [appointmentCustomer, setAppointmentCustomer] = useState<Customer | null>(null)
  const [appointmentDealer, setAppointmentDealer] = useState<{ name: string; cnpj: string; address: string } | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [bookingAppointment, setBookingAppointment] = useState(false)
  const [bookedAppointment, setBookedAppointment] = useState<any | null>(null)

  const toggleReplace = (partName: string) => {
    setReplaceParts(prev => ({ ...prev, [partName]: !prev[partName] }))
  }

  // Redirect if no crash data and no way to load it
  useEffect(() => {
    if (!crash && !id && !isLoadingCrash) {
      navigate('/results', { replace: true })
    }
    if (loadError) {
      toast.error('Sinistro não encontrado')
      navigate('/results', { replace: true })
    }
  }, [crash, id, isLoadingCrash, loadError, navigate])

  // Fetch parts for pricing
  const { data: allParts = [] } = useQuery({
    queryKey: ['parts-all'],
    queryFn: () => partService.list({ per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoadingCrash) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-vw-blue" />
      </div>
    )
  }

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

  const openAppointmentModal = async () => {
    if (!selectedVehicle?.customer_id) {
      toast.error('Veículo não possui proprietário cadastrado')
      return
    }

    setShowAppointmentModal(true)
    setAppointmentCustomer(null)
    setAppointmentDealer(null)
    setBookedAppointment(null)
    setSelectedDate(null)
    setSelectedTime('')
    setLoadingAppointmentData(true)

    try {
      const customer = await customerService.getById(selectedVehicle.customer_id)
      setAppointmentCustomer(customer)

      setAppointmentNotes(
        `Reparo de colisão - Severidade: ${severityLabels[severity]} - ${crashParts.length} peças afetadas - Custo estimado: ${formatBRL(totalCost)}`
      )

      if (customer.preferred_dealer_id) {
        try {
          const dealer = await dealerService.getById(customer.preferred_dealer_id)
          setAppointmentDealer({
            name: dealer.name,
            cnpj: dealer.business_id,
            address: `${dealer.address}, ${dealer.city} - ${dealer.state}`,
          })
        } catch {
          toast.error('Erro ao carregar dados da concessionária')
          setShowAppointmentModal(false)
        }
      } else {
        toast.error('Cliente não possui concessionária preferida cadastrada')
        setShowAppointmentModal(false)
      }
    } catch {
      toast.error('Erro ao carregar dados do proprietário')
      setShowAppointmentModal(false)
    } finally {
      setLoadingAppointmentData(false)
    }
  }

  const handleBookAppointment = async () => {
    if (!appointmentCustomer || !appointmentDealer || !selectedDate || !selectedTime) return

    setBookingAppointment(true)
    try {
      const result = await appointmentService.book({
        dealer_cnpj: appointmentDealer.cnpj,
        service_type: 'crash_repair',
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedTime,
        estimated_duration_hours: totalLaborHours,
        priority: inferPriority(severity),
        notes: appointmentNotes,
        customer_info: {
          name: appointmentCustomer.name,
          phone: appointmentCustomer.phone,
          preferred_contact: 'whatsapp',
        },
        vehicle_info: {
          make: crash.vehicle?.brand || 'Volkswagen',
          model: crash.vehicle?.model || crash.vehicle?.name || '',
          year: selectedVehicle?.year || new Date().getFullYear(),
          vin: selectedVehicle?.vin || '',
        },
        damage_assessment: {
          severity,
          total_damage: realTotalDamage,
          parts_count: crashParts.length,
          total_cost: totalCost,
        },
      })
      setBookedAppointment(result)
      toast.success('Agendamento confirmado!')
    } catch {
      toast.error('Erro ao agendar reparo')
    } finally {
      setBookingAppointment(false)
    }
  }

  const availableDates = generateAvailableDates()

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
              {crash.vehicle ? `${crash.vehicle.brand} ${crash.vehicle.name}` : 'Veículo'} &middot; {formatDateOnly(crash.received_at)} {formatTimeOnly(crash.received_at)}
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatDateOnly(crash.received_at)}</p>
                    <p className="text-sm text-gray-500">{formatTimeOnly(crash.received_at)}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-xl p-4 border shadow-sm ${severityColors[severity]}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{severityLabels[severity]}</p>
                      <p className="text-sm opacity-70">Severidade</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{(realTotalDamage * 100).toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Dano Total</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{crashParts.length}</p>
                      <p className="text-sm text-gray-500">Peças Danificadas</p>
                    </div>
                  </div>
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
          <div className="lg:sticky lg:top-6 space-y-6 self-start">
            {/* Time estimate */}
            <motion.div
              className="bg-vw-blue text-white rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5" />
                <h3 className="font-semibold">Tempo Estimado</h3>
              </div>
              <p className="text-3xl font-bold">{totalLaborHours.toFixed(1)}h</p>
              <p className="text-blue-200 text-sm mt-1">de mão de obra para reparo</p>
            </motion.div>

            {/* Cost Breakdown */}
            <motion.div
              className="bg-white rounded-xl p-6 shadow-sm border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
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

            {/* Schedule Repair Button */}
            <motion.button
              onClick={openAppointmentModal}
              className="w-full flex items-center justify-center gap-2 bg-vw-blue hover:bg-vw-dark-blue text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Calendar className="h-5 w-5" />
              Agendar Reparo
            </motion.button>

            {/* WhatsApp Button */}
            <motion.button
              onClick={openWppModal}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Orçamento via WhatsApp
            </motion.button>

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

      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-vw-blue" />
                {bookedAppointment ? 'Agendamento Confirmado' : 'Agendar Reparo'}
              </h3>
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {loadingAppointmentData ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : bookedAppointment ? (
                /* Confirmation View */
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">Agendamento Confirmado!</p>
                    <p className="text-sm text-gray-500 mt-1">Seu reparo foi agendado com sucesso</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
                    {bookedAppointment.booking_confirmation?.confirmation_number && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Confirmação</p>
                        <p className="font-bold text-vw-blue text-lg">{bookedAppointment.booking_confirmation.confirmation_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Data</p>
                      <p className="font-medium text-gray-900">
                        {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Horário</p>
                      <p className="font-medium text-gray-900">{selectedTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Concessionária</p>
                      <p className="font-medium text-gray-900">{appointmentDealer?.name}</p>
                    </div>
                  </div>
                </div>
              ) : appointmentCustomer && appointmentDealer ? (
                /* Booking Form */
                <div className="space-y-5">
                  {/* Pre-populated Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Concessionária</p>
                      <p className="font-medium text-gray-900 text-sm">{appointmentDealer.name}</p>
                      <p className="text-xs text-gray-400">{appointmentDealer.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Cliente</p>
                      <p className="font-medium text-gray-900 text-sm">{appointmentCustomer.name}</p>
                      <p className="text-xs text-gray-400">{customerService.formatPhone(appointmentCustomer.phone)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Veículo</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {crash.vehicle?.brand} {crash.vehicle?.name || crash.vehicle?.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Serviço</p>
                      <p className="font-medium text-gray-900 text-sm">Reparo de Colisão</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Prioridade</p>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${priorityLabels[inferPriority(severity)].color}`}>
                        {priorityLabels[inferPriority(severity)].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Estimativa</p>
                      <p className="font-medium text-gray-900 text-sm">{totalLaborHours.toFixed(1)}h - {formatBRL(totalCost)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    {/* Date Selection */}
                    <p className="text-sm font-semibold text-gray-900 mb-2">Selecione a Data</p>
                    <div className="grid grid-cols-5 gap-2">
                      {availableDates.map(date => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString()
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => { setSelectedDate(date); setSelectedTime('') }}
                            className={`p-2 rounded-lg text-center text-sm transition-colors border ${
                              isSelected
                                ? 'bg-vw-blue text-white border-vw-blue'
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="block text-xs opacity-75">
                              {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                            <span className="block font-semibold">
                              {date.getDate()}/{date.getMonth() + 1}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time Selection */}
                  {selectedDate && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-2">Selecione o Horário</p>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map(time => {
                          const isSelected = selectedTime === time
                          return (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                                isSelected
                                  ? 'bg-vw-blue text-white border-vw-blue'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Observações</p>
                    <textarea
                      value={appointmentNotes}
                      onChange={e => setAppointmentNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      rows={2}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
              {bookedAppointment ? (
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-4 py-2 text-sm bg-vw-blue hover:bg-vw-dark-blue text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    disabled={!selectedDate || !selectedTime || bookingAppointment}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-vw-blue hover:bg-vw-dark-blue text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bookingAppointment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    {bookingAppointment ? 'Agendando...' : 'Confirmar Agendamento'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
