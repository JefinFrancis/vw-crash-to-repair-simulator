import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  ChevronRight,
  Filter,
  Search,
  CheckCircle,
  Wrench,
  Car,
  Navigation,
  Building2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/api'

// Brazilian states for filter
const BRAZILIAN_STATES = [
  { code: 'SP', name: 'São Paulo' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'PR', name: 'Paraná' },
  { code: 'BA', name: 'Bahia' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'GO', name: 'Goiás' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'CE', name: 'Ceará' },
]

// Service types
const SERVICE_TYPES = [
  { id: 'bodyshop', name: 'Funilaria', icon: '🔧' },
  { id: 'service', name: 'Mecânica', icon: '⚙️' },
  { id: 'parts', name: 'Peças', icon: '📦' },
  { id: 'sales', name: 'Vendas', icon: '🚗' },
]

interface Dealer {
  id: string
  name: string
  cnpj?: string
  address: string
  city: string
  state: string
  postal_code: string
  phone: string
  email?: string
  website?: string
  latitude?: number
  longitude?: number
  services: string[]
  specialties: string[]
  working_hours?: any
  is_authorized: boolean
  is_active: boolean
  distance_km?: number
  created_at: string
  updated_at: string
}

// Format phone number
const formatPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
}

export function DealerNetworkPage() {
  const navigate = useNavigate()
  const { currentDamageAssessment, setCurrentAppointment } = useAppStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch dealers
  const { data: dealersData, isLoading, error } = useQuery({
    queryKey: ['dealers', selectedState],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedState) params.set('state', selectedState)
      const response = await apiClient.get<Dealer[]>(`/dealers/?${params.toString()}`)
      return response
    },
  })

  const dealers = dealersData || []

  // Filter dealers
  const filteredDealers = dealers.filter((dealer: Dealer) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        dealer.name.toLowerCase().includes(query) ||
        dealer.city.toLowerCase().includes(query) ||
        dealer.address.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    
    // Services filter
    if (selectedServices.length > 0) {
      const hasService = selectedServices.some(service => 
        dealer.services?.includes(service)
      )
      if (!hasService) return false
    }
    
    return true
  })

  // Handle dealer selection
  const handleSelectDealer = (dealer: Dealer) => {
    setSelectedDealer(dealer)
    toast.success(`${dealer.name} selecionada!`)
  }

  // Proceed to appointment
  const handleProceedToAppointment = () => {
    if (!selectedDealer) {
      toast.error('Selecione uma concessionária primeiro')
      return
    }
    
    // Store selected dealer info for appointment page
    setCurrentAppointment({
      id: '',
      booking_id: '',
      confirmation_number: '',
      dealer_cnpj: selectedDealer.cnpj || selectedDealer.id,
      service_type: 'collision_repair',
      appointment_date: '',
      appointment_time: '',
      priority: 'normal',
      customer_info: {
        name: '',
        phone: '',
        preferred_contact: 'phone',
      },
      vehicle_info: {
        make: 'Volkswagen',
        model: '',
        year: new Date().getFullYear(),
      },
      status_info: {
        status: 'pending',
        status_description: 'Agendamento pendente',
        last_updated: new Date().toISOString(),
        next_actions: ['Confirmar agendamento'],
        can_reschedule: true,
        can_cancel: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    
    navigate('/appointment')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-8">
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">🏦 Rede de Concessionárias</h1>
            <p className="text-vw-blue-light">
              Encontre a concessionária VW mais próxima para seu reparo
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Damage Summary Banner (if coming from results) */}
        {currentDamageAssessment && (
          <motion.div
            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  Orçamento estimado: R$ {currentDamageAssessment.total_estimated_cost.toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-amber-700">
                  {currentDamageAssessment.component_damages?.length || 0} componentes afetados • 
                  {currentDamageAssessment.total_estimated_hours}h tempo de reparo
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          className="vw-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, cidade ou endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
              />
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            >
              <option value="">Todos os Estados</option>
              {BRAZILIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-vw-blue text-white border-vw-blue' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-5 w-5" />
              Filtros
            </button>
          </div>

          {/* Service Filters */}
          {showFilters && (
            <motion.div
              className="mt-4 pt-4 border-t"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <p className="text-sm font-medium text-gray-700 mb-3">Serviços disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPES.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedServices(prev =>
                        prev.includes(service.id)
                          ? prev.filter(s => s !== service.id)
                          : [...prev, service.id]
                      )
                    }}
                    className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                      selectedServices.includes(service.id)
                        ? 'bg-vw-blue text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{service.icon}</span>
                    {service.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dealer List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {filteredDealers.length} concessionária{filteredDealers.length !== 1 ? 's' : ''} encontrada{filteredDealers.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {isLoading ? (
              <div className="vw-card text-center py-12">
                <div className="animate-spin h-8 w-8 border-b-2 border-vw-blue mx-auto mb-4 rounded-full"></div>
                <p className="text-gray-500">Carregando concessionárias...</p>
              </div>
            ) : filteredDealers.length === 0 ? (
              <div className="vw-card text-center py-12">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-2">Nenhuma concessionária encontrada</p>
                <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDealers.map((dealer: Dealer, index: number) => (
                  <motion.div
                    key={dealer.id}
                    className={`vw-card cursor-pointer transition-all ${
                      selectedDealer?.id === dealer.id
                        ? 'ring-2 ring-vw-blue bg-vw-blue/5'
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => handleSelectDealer(dealer)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-vw-blue">
                            {dealer.name}
                          </h3>
                          {dealer.is_authorized && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Autorizada
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {dealer.address}, {dealer.city} - {dealer.state}
                          </p>
                          
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {formatPhone(dealer.phone)}
                          </p>

                          {dealer.email && (
                            <p className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              {dealer.email}
                            </p>
                          )}
                        </div>

                        {/* Services */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {dealer.services?.slice(0, 4).map((service) => (
                            <span
                              key={service}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {service === 'bodyshop' ? '🔧 Funilaria' :
                               service === 'service' ? '⚙️ Mecânica' :
                               service === 'parts' ? '📦 Peças' :
                               service === 'sales' ? '🚗 Vendas' : service}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        {selectedDealer?.id === dealer.id ? (
                          <div className="p-2 bg-vw-blue rounded-full">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        
                        {dealer.distance_km && (
                          <p className="text-sm text-gray-500 mt-2">
                            {dealer.distance_km.toFixed(1)} km
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Dealer Panel */}
          <div className="space-y-6">
            {selectedDealer ? (
              <motion.div
                className="vw-card sticky top-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-vw-blue" />
                  Concessionária Selecionada
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-vw-blue">{selectedDealer.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {selectedDealer.address}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {selectedDealer.city} - {selectedDealer.state}, {selectedDealer.postal_code}
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Contato</h4>
                    <div className="space-y-2 text-sm">
                      <a 
                        href={`tel:${selectedDealer.phone}`}
                        className="flex items-center gap-2 text-vw-blue hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {formatPhone(selectedDealer.phone)}
                      </a>
                      {selectedDealer.email && (
                        <a 
                          href={`mailto:${selectedDealer.email}`}
                          className="flex items-center gap-2 text-vw-blue hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          {selectedDealer.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Especialidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDealer.specialties?.map((specialty) => (
                        <span
                          key={specialty}
                          className="px-2 py-1 text-xs bg-vw-blue/10 text-vw-blue rounded"
                        >
                          {specialty === 'collision_repair' ? 'Reparo de Colisão' :
                           specialty === 'paint' ? 'Pintura' :
                           specialty === 'electrical' ? 'Elétrica' :
                           specialty === 'warranty' ? 'Garantia' :
                           specialty === 'performance' ? 'Performance' : specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleProceedToAppointment}
                    className="w-full vw-btn-primary flex items-center justify-center gap-2 mt-4"
                  >
                    <Clock className="h-5 w-5" />
                    Agendar Reparo
                  </button>

                  {selectedDealer.latitude && selectedDealer.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDealer.latitude},${selectedDealer.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full vw-btn-outline flex items-center justify-center gap-2"
                    >
                      <Navigation className="h-5 w-5" />
                      Abrir no Maps
                    </a>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="vw-card text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-2">Selecione uma concessionária</p>
                <p className="text-sm text-gray-400">
                  Clique em uma das concessionárias à esquerda para ver mais detalhes
                </p>
              </motion.div>
            )}

            {/* Help Card */}
            <motion.div
              className="vw-card bg-vw-blue/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-vw-blue" />
                Precisa de ajuda?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Nossa central de atendimento pode ajudá-lo a encontrar a melhor opção para seu reparo.
              </p>
              <a
                href="tel:08007022470"
                className="text-vw-blue font-medium hover:underline text-sm"
              >
                📞 0800 702 2470
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}