import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Car,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  CreditCard,
  Wrench,
  Shield,
  Loader2
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { appointmentService } from '../services/appointmentService'
import { CustomerInfo, VehicleInfo, Appointment } from '../types'

// Time slots
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
]

// Service types with icons and descriptions
const SERVICE_TYPES = [
  { 
    id: 'crash_repair', 
    name: 'Reparo de Colisão', 
    description: 'Reparos estruturais e de carroceria após colisão',
    icon: '🔧',
    estimatedHours: 16
  },
  { 
    id: 'mechanical', 
    name: 'Mecânica', 
    description: 'Diagnóstico e reparo de componentes mecânicos',
    icon: '⚙️',
    estimatedHours: 8
  },
  { 
    id: 'paint', 
    name: 'Pintura', 
    description: 'Pintura de carroceria e acabamento',
    icon: '🎨',
    estimatedHours: 12
  },
  { 
    id: 'inspection', 
    name: 'Inspeção', 
    description: 'Inspeção completa do veículo',
    icon: '🔍',
    estimatedHours: 2
  },
]

// Priority levels
const PRIORITY_LEVELS = [
  { id: 'normal', name: 'Normal', description: 'Agendamento padrão', color: 'gray' },
  { id: 'high', name: 'Alta', description: 'Preferência de atendimento', color: 'yellow' },
  { id: 'urgent', name: 'Urgente', description: 'Serviço prioritário', color: 'red' },
]

// Format date for display in BRT (UTC-3)
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Format currency in BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Generate next 14 days for date picker
const generateDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    // Skip Sundays
    if (date.getDay() !== 0) {
      dates.push(date)
    }
  }
  return dates
}

type BookingStep = 'service' | 'datetime' | 'customer' | 'review' | 'confirmation'

export function AppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dealerCnpj = searchParams.get('dealer')
  const dealerName = searchParams.get('name')
  
  const { 
    currentDamageAssessment, 
    selectedVehicle,
    setCurrentAppointment 
  } = useAppStore()

  // Booking state
  const [currentStep, setCurrentStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [notes, setNotes] = useState<string>('')
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    preferred_contact: 'whatsapp'
  })
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    make: 'Volkswagen',
    model: selectedVehicle?.model || '',
    year: selectedVehicle?.year || new Date().getFullYear(),
    vin: selectedVehicle?.vin || '',
    license_plate: ''
  })
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null)

  const availableDates = generateDates()

  // Redirect if no dealer selected
  useEffect(() => {
    if (!dealerCnpj) {
      navigate('/dealers')
    }
  }, [dealerCnpj, navigate])

  // Pre-fill vehicle info from selected vehicle
  useEffect(() => {
    if (selectedVehicle) {
      setVehicleInfo(prev => ({
        ...prev,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        vin: selectedVehicle.vin
      }))
    }
  }, [selectedVehicle])

  // Auto-select crash repair if coming from damage assessment
  useEffect(() => {
    if (currentDamageAssessment && !selectedService) {
      setSelectedService('crash_repair')
    }
  }, [currentDamageAssessment, selectedService])

  // Book appointment mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!dealerCnpj || !selectedDate || !selectedTime) {
        throw new Error('Missing required booking information')
      }

      const serviceType = SERVICE_TYPES.find(s => s.id === selectedService)
      
      return appointmentService.book({
        dealer_cnpj: dealerCnpj,
        service_type: selectedService,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedTime,
        estimated_duration_hours: serviceType?.estimatedHours || 8,
        priority,
        notes,
        customer_info: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          preferred_contact: customerInfo.preferred_contact
        },
        vehicle_info: vehicleInfo,
        damage_assessment: currentDamageAssessment
      })
    },
    onSuccess: (data) => {
      setBookedAppointment(data)
      setCurrentAppointment(data)
      setCurrentStep('confirmation')
      toast.success('Agendamento confirmado!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao agendar')
    }
  })

  // Validation
  const canProceed = () => {
    switch (currentStep) {
      case 'service':
        return !!selectedService
      case 'datetime':
        return !!selectedDate && !!selectedTime
      case 'customer':
        return customerInfo.name.trim() !== '' && 
               customerInfo.phone.trim().length >= 10 &&
               vehicleInfo.model.trim() !== ''
      case 'review':
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    const steps: BookingStep[] = ['service', 'datetime', 'customer', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    } else {
      bookingMutation.mutate()
    }
  }

  const goBack = () => {
    const steps: BookingStep[] = ['service', 'datetime', 'customer', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    } else {
      navigate('/dealers')
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'service':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Tipo de Serviço
              </h2>
              <p className="text-gray-600">
                Selecione o serviço que você precisa
              </p>
            </div>

            <div className="grid gap-4">
              {SERVICE_TYPES.map((service) => (
                <motion.div
                  key={service.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedService === service.id
                      ? 'border-vw-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{service.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{service.name}</h3>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Estimativa</p>
                      <p className="font-semibold text-vw-blue">~{service.estimatedHours}h</p>
                    </div>
                    {selectedService === service.id && (
                      <CheckCircle className="w-6 h-6 text-vw-blue" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Priority Selection */}
            <div className="mt-8">
              <h3 className="font-semibold text-gray-800 mb-3">Prioridade</h3>
              <div className="flex gap-3">
                {PRIORITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setPriority(level.id as any)}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      priority === level.id
                        ? 'border-vw-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{level.name}</p>
                    <p className="text-xs text-gray-500">{level.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'datetime':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Data e Horário
              </h2>
              <p className="text-gray-600">
                Escolha quando deseja trazer seu veículo
              </p>
            </div>

            {/* Date Selection */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Selecione a Data
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {availableDates.map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString()
                  const dayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date)
                  const dayNum = date.getDate()
                  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
                  
                  return (
                    <motion.button
                      key={date.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-vw-blue bg-vw-blue text-white'
                          : 'border-gray-200 hover:border-vw-blue'
                      }`}
                    >
                      <p className={`text-xs uppercase ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                        {dayName}
                      </p>
                      <p className="text-xl font-bold">{dayNum}</p>
                      <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                        {month}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Selecione o Horário
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const isSelected = selectedTime === time
                    
                    return (
                      <motion.button
                        key={time}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-vw-blue bg-vw-blue text-white'
                            : 'border-gray-200 hover:border-vw-blue'
                        }`}
                      >
                        <p className="font-semibold">{time}</p>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {selectedDate && selectedTime && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Agendamento: {formatDate(selectedDate)} às {selectedTime}
                </p>
              </motion.div>
            )}
          </div>
        )

      case 'customer':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Suas Informações
              </h2>
              <p className="text-gray-600">
                Informações de contato e registro do veículo
              </p>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Cliente
              </h3>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone/WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={customerInfo.email || ''}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contato Preferido
                  </label>
                  <div className="flex gap-3">
                    {['whatsapp', 'phone', 'email', 'sms'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setCustomerInfo({ ...customerInfo, preferred_contact: method as any })}
                        className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                          customerInfo.preferred_contact === method
                            ? 'border-vw-blue bg-blue-50 text-vw-blue'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {method === 'whatsapp' ? 'WhatsApp' : 
                         method === 'phone' ? 'Ligar' : 
                         method === 'email' ? 'E-mail' : 'SMS'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Car className="w-5 h-5" />
                Dados do Veículo
              </h3>
              
              <div className="grid gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.make}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, make: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Volkswagen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.model}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="T-Cross"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano
                    </label>
                    <input
                      type="number"
                      value={vehicleInfo.year}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, year: parseInt(e.target.value) || 2024 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      min="2000"
                      max="2026"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placa
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.license_plate || ''}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, license_plate: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent uppercase"
                      placeholder="ABC-1234"
                      maxLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chassis (VIN)
                    </label>
                    <input
                      type="text"
                      value={vehicleInfo.vin || ''}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, vin: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent uppercase"
                      placeholder="9BWZZZ377VT004251"
                      maxLength={17}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observações
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                rows={3}
                placeholder="Descreva detalhes adicionais sobre o serviço necessário..."
              />
            </div>
          </div>
        )

      case 'review':
        const service = SERVICE_TYPES.find(s => s.id === selectedService)
        
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Revisar Agendamento
              </h2>
              <p className="text-gray-600">
                Confira os dados antes de confirmar
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4">
              {/* Dealer */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-vw-blue rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Concessionária</p>
                    <p className="font-semibold text-gray-800">{dealerName || 'Concessionária VW'}</p>
                  </div>
                </div>
              </div>

              {/* Service */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{service?.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Serviço</p>
                    <p className="font-semibold text-gray-800">{service?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Duração Estimada</p>
                    <p className="font-semibold text-vw-blue">~{service?.estimatedHours}h</p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Data e Horário</p>
                    <p className="font-semibold text-gray-800">
                      {selectedDate ? formatDate(selectedDate) : ''} às {selectedTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p className="font-semibold text-gray-800">{customerInfo.name}</p>
                    <p className="text-sm text-gray-500">{customerInfo.phone}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Veículo</p>
                    <p className="font-semibold text-gray-800">
                      {vehicleInfo.make} {vehicleInfo.model} {vehicleInfo.year}
                    </p>
                    {vehicleInfo.license_plate && (
                      <p className="text-sm text-gray-500">Placa: {vehicleInfo.license_plate}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Damage Assessment */}
              {currentDamageAssessment && (
                <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-orange-600">Avaliação de Danos Incluída</p>
                      <p className="font-semibold text-gray-800">
                        {currentDamageAssessment.component_damages?.length || 0} componentes afetados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Estimativa</p>
                      <p className="font-bold text-orange-600">
                        {formatBRL(currentDamageAssessment.total_estimated_cost || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {notes && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500 mb-1">Observações</p>
                  <p className="text-gray-700">{notes}</p>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex gap-3">
                <Shield className="w-6 h-6 text-vw-blue flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-800 mb-1">Termos do Agendamento</p>
                  <ul className="space-y-1">
                    <li>• Chegue 15 minutos antes</li>
                    <li>• Traga os documentos do veículo (CRLV)</li>
                    <li>• Cancelamentos devem ser feitos com 24 horas de antecedência</li>
                    <li>• Valores são estimativas sujeitas a avaliação presencial</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'confirmation':
        return (
          <div className="space-y-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Agendamento Confirmado!
              </h2>
              <p className="text-gray-600">
                Seu agendamento foi realizado com sucesso
              </p>
            </div>

            {bookedAppointment && (
              <div className="bg-white rounded-xl border-2 border-green-200 p-6 max-w-md mx-auto">
                <p className="text-sm text-gray-500 mb-2">Número de Confirmação</p>
                <p className="text-2xl font-mono font-bold text-vw-blue">
                  {bookedAppointment.confirmation_number || bookedAppointment.booking_id?.slice(0, 8).toUpperCase()}
                </p>
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-left">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Data</p>
                      <p className="font-medium">{selectedDate ? formatDate(selectedDate) : ''}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Horário</p>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-6 bg-vw-blue text-white rounded-lg font-semibold hover:bg-vw-dark-blue transition-colors"
              >
                Voltar ao Início
              </button>
              <button
                onClick={() => navigate('/simulation')}
                className="w-full py-3 px-6 border-2 border-vw-blue text-vw-blue rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Nova Simulação
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Step indicator
  const steps = [
    { id: 'service', label: 'Serviço', icon: Wrench },
    { id: 'datetime', label: 'Data/Hora', icon: Calendar },
    { id: 'customer', label: 'Detalhes', icon: User },
    { id: 'review', label: 'Revisar', icon: FileText },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-6">
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-1">📅 Agendar Serviço</h1>
            <p className="opacity-90">{dealerName || 'Concessionária VW'}</p>
          </motion.div>
        </div>
      </div>

      {/* Step Indicator */}
      {currentStep !== 'confirmation' && (
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="vw-container">
            <div className="flex justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 ${
                      isActive ? 'text-vw-blue' : 
                      isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-vw-blue text-white' :
                        isCompleted ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-medium hidden md:block">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 md:w-24 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="vw-container py-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation Buttons */}
        {currentStep !== 'confirmation' && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>

            <button
              onClick={goNext}
              disabled={!canProceed() || bookingMutation.isPending}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all ${
                canProceed() && !bookingMutation.isPending
                  ? 'bg-vw-blue text-white hover:bg-vw-dark-blue'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : currentStep === 'review' ? (
                <>
                  Confirmar Agendamento
                  <CheckCircle className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}