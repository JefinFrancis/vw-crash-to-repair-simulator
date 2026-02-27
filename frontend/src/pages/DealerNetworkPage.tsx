import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Phone,
  Mail,
  Search,
  CheckCircle,
  Building2,
  Plus,
  X,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '../services/api'
import { dealerService } from '../services/dealerService'

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

// Format phone number
const formatPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
}

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

interface DealerFormData {
  name: string
  cnpj: string
  address: string
  city: string
  state: string
  postal_code: string
  phone: string
  email: string
}

const emptyForm: DealerFormData = {
  name: '', cnpj: '', address: '', city: '', state: '', postal_code: '', phone: '', email: '',
}

export function DealerNetworkPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)
  const [dealerForm, setDealerForm] = useState<DealerFormData>(emptyForm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Dealer | null>(null)

  const queryClient = useQueryClient()

  const handleCloseModal = () => {
    setShowModal(false)
    setIsEditMode(false)
    setSelectedDealer(null)
    setDealerForm(emptyForm)
  }

  const handleOpenCreateModal = () => {
    setIsEditMode(false)
    setSelectedDealer(null)
    setDealerForm(emptyForm)
    setShowModal(true)
  }

  const handleOpenEditModal = (dealer: Dealer, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditMode(true)
    setSelectedDealer(dealer)
    setDealerForm({
      name: dealer.name,
      cnpj: dealer.cnpj || '',
      address: dealer.address,
      city: dealer.city,
      state: dealer.state,
      postal_code: dealer.postal_code,
      phone: dealer.phone,
      email: dealer.email || '',
    })
    setShowModal(true)
  }

  const createDealerMutation = useMutation({
    mutationFn: (data: DealerFormData) => dealerService.create({
      ...data,
      email: data.email || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] })
      toast.success('Concessionária criada com sucesso!')
      handleCloseModal()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar concessionária')
    },
  })

  const updateDealerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DealerFormData> }) =>
      dealerService.update(id, {
        ...data,
        email: data.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] })
      toast.success('Concessionária atualizada com sucesso!')
      handleCloseModal()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar concessionária')
    },
  })

  const deleteDealerMutation = useMutation({
    mutationFn: (id: string) => dealerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] })
      toast.success('Concessionária removida com sucesso!')
      setShowDeleteConfirm(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover concessionária')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dealerForm.name.trim() || !dealerForm.cnpj.trim() || !dealerForm.phone.trim()) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (isEditMode && selectedDealer) {
      updateDealerMutation.mutate({ id: selectedDealer.id, data: dealerForm })
    } else {
      createDealerMutation.mutate(dealerForm)
    }
  }

  const isMutating = createDealerMutation.isPending || updateDealerMutation.isPending

  // Fetch dealers
  const { data: dealersData, isLoading } = useQuery({
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
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        dealer.name.toLowerCase().includes(query) ||
        dealer.city.toLowerCase().includes(query) ||
        dealer.address.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    return true
  })

  // Stats
  const totalDealers = dealers.length
  const authorizedCount = dealers.filter(d => d.is_authorized).length
  const uniqueCities = new Set(dealers.map(d => d.city)).size

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
              <MapPin className="h-8 w-8" />
              Concessionárias
            </h1>
            <p className="text-blue-200 mt-2">
              Gerencie a rede de concessionárias VW
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDealers}</p>
                <p className="text-sm text-gray-500">Total de Concessionárias</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{authorizedCount}</p>
                <p className="text-sm text-gray-500">Autorizadas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{uniqueCities}</p>
                <p className="text-sm text-gray-500">Cidades</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions Bar */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent bg-white"
          >
            <option value="">Todos os Estados</option>
            {BRAZILIAN_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>

          {/* Add Dealer Button */}
          <button
            onClick={handleOpenCreateModal}
            className="vw-button-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Adicionar Concessionária
          </button>
        </motion.div>

        {/* Dealer List */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
              <div className="col-span-4">Nome</div>
              <div className="col-span-3">Localização</div>
              <div className="col-span-2">Telefone</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-vw-blue animate-spin" />
            </div>
          ) : filteredDealers.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma concessionária encontrada</p>
              <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            filteredDealers.map((dealer: Dealer) => (
              <motion.div
                key={dealer.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b hover:bg-gray-50 transition-colors items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{dealer.name}</p>
                    {dealer.email && (
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {dealer.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-3 text-sm text-gray-600 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{dealer.city} - {dealer.state}</span>
                </div>
                <div className="col-span-2 text-sm text-gray-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span>{formatPhone(dealer.phone)}</span>
                </div>
                <div className="col-span-1">
                  {dealer.is_authorized ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      Autorizada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-600">
                      Parceira
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex justify-end items-center gap-1">
                  <button
                    onClick={(e) => handleOpenEditModal(dealer, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-vw-blue hover:bg-blue-50 transition-colors"
                    title="Editar concessionária"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(dealer) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover concessionária"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
          {filteredDealers.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Exibindo {filteredDealers.length} de {dealers.length} concessionárias
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create / Edit Dealer Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {isEditMode ? 'Editar Concessionária' : 'Nova Concessionária'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isMutating}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dealerForm.name}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="Nome da concessionária"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dealerForm.cnpj}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="00.000.000/0000-00"
                    required
                    disabled={isEditMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={dealerForm.phone}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={dealerForm.address}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="Rua, número"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={dealerForm.city}
                      onChange={(e) => setDealerForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={dealerForm.state}
                      onChange={(e) => setDealerForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      {BRAZILIAN_STATES.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input
                    type="text"
                    value={dealerForm.postal_code}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Opcional)</label>
                  <input
                    type="email"
                    value={dealerForm.email}
                    onChange={(e) => setDealerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                    placeholder="email@concessionaria.com"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 vw-button-secondary"
                    disabled={isMutating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 vw-button-primary flex items-center justify-center gap-2"
                    disabled={isMutating}
                  >
                    {isMutating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : isEditMode ? (
                      'Salvar Alterações'
                    ) : (
                      'Criar Concessionária'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                  Remover Concessionária
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  Tem certeza que deseja remover <strong>{showDeleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 vw-button-secondary"
                  disabled={deleteDealerMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteDealerMutation.mutate(showDeleteConfirm.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={deleteDealerMutation.isPending}
                >
                  {deleteDealerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    'Remover'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
