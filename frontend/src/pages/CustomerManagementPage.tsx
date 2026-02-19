import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  User,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { customerService, Customer, CustomerCreate } from '../services/customerService'
import { dealerService } from '../services/dealerService'
import { Dealer } from '../types'
import toast from 'react-hot-toast'

interface FormData {
  name: string
  phone: string
  preferred_dealer_cnpj: string
}

export function CustomerManagementPage() {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    preferred_dealer_cnpj: ''
  })
  const [phoneError, setPhoneError] = useState('')

  const queryClient = useQueryClient()

  // Fetch customers
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.list({ limit: 1000 }),
  })

  // Fetch dealers for dropdown
  const { data: dealers = [] } = useQuery<Dealer[]>({
    queryKey: ['dealers'],
    queryFn: () => dealerService.list({ per_page: 100 }),
  })

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data: CustomerCreate) => customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Cliente criado com sucesso!')
      handleCloseModal()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar cliente')
    },
  })

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerCreate> }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Cliente atualizado com sucesso!')
      handleCloseModal()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar cliente')
    },
  })

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Cliente excluído com sucesso!')
      setShowDeleteDialog(false)
      setSelectedCustomer(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir cliente')
    },
  })

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const searchLower = search.toLowerCase()
      const formattedPhone = customerService.formatPhone(customer.phone)
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(search) ||
        formattedPhone.includes(search)
      )
    })
  }, [customers, search])

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const newThisMonth = customers.filter(customer => {
      const createdDate = new Date(customer.created_at)
      return (
        createdDate.getMonth() === currentMonth &&
        createdDate.getFullYear() === currentYear
      )
    }).length

    const withPreferredDealer = customers.filter(
      customer => customer.preferred_dealer_cnpj
    ).length

    return {
      total: customers.length,
      newThisMonth,
      withPreferredDealer,
    }
  }, [customers])

  const handleOpenCreateModal = () => {
    setIsEditMode(false)
    setSelectedCustomer(null)
    setFormData({
      name: '',
      phone: '',
      preferred_dealer_cnpj: ''
    })
    setPhoneError('')
    setShowModal(true)
  }

  const handleOpenEditModal = (customer: Customer) => {
    setIsEditMode(true)
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customerService.formatPhone(customer.phone),
      preferred_dealer_cnpj: customer.preferred_dealer_cnpj || ''
    })
    setPhoneError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedCustomer(null)
    setFormData({
      name: '',
      phone: '',
      preferred_dealer_cnpj: ''
    })
    setPhoneError('')
  }

  const handlePhoneChange = (value: string) => {
    // Allow only digits and formatting characters
    const cleaned = value.replace(/[^\d]/g, '')

    // Format as user types
    let formatted = ''
    if (cleaned.length > 0) {
      formatted = '('
      formatted += cleaned.substring(0, 2)
      if (cleaned.length > 2) {
        formatted += ') '
        formatted += cleaned.substring(2, 7)
        if (cleaned.length > 7) {
          formatted += '-'
          formatted += cleaned.substring(7, 11)
        }
      }
    }

    setFormData(prev => ({ ...prev, phone: formatted }))

    // Validate phone
    if (cleaned.length === 11) {
      const unformatted = customerService.unformatPhone(formatted)
      if (!customerService.validatePhone(unformatted)) {
        setPhoneError('Número de celular inválido. Use o formato: (11) 99999-9999')
      } else {
        setPhoneError('')
      }
    } else if (cleaned.length > 0 && cleaned.length < 11) {
      setPhoneError('Número incompleto. Digite 11 dígitos.')
    } else {
      setPhoneError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório')
      return
    }

    // Validate phone format
    const unformattedPhone = customerService.unformatPhone(formData.phone)
    if (!customerService.validatePhone(unformattedPhone)) {
      toast.error('Número de telefone inválido')
      return
    }

    const submitData: CustomerCreate = {
      name: formData.name.trim(),
      phone: unformattedPhone,
      preferred_dealer_cnpj: formData.preferred_dealer_cnpj || undefined
    }

    if (isEditMode && selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, data: submitData })
    } else {
      createCustomerMutation.mutate(submitData)
    }
  }

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedCustomer) {
      deleteCustomerMutation.mutate(selectedCustomer.id)
    }
  }

  const getDealerName = (cnpj?: string) => {
    if (!cnpj) return 'Nenhuma'
    const dealer = dealers.find(d => d.business_id === cnpj)
    return dealer ? dealer.name : cnpj
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
              <Users className="h-8 w-8" />
              Gerenciamento de Clientes
            </h1>
            <p className="text-blue-200 mt-2">
              Gerencie seus clientes e suas preferências de concessionária
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
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total de Clientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
                <p className="text-sm text-gray-500">Novos Este Mês</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.withPreferredDealer}</p>
                <p className="text-sm text-gray-500">Com Concessionária Preferida</p>
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
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>

          {/* Add Customer Button */}
          <button
            onClick={handleOpenCreateModal}
            className="vw-button-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Adicionar Cliente
          </button>
        </motion.div>

        {/* Customer List */}
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
              <div className="col-span-3">Telefone</div>
              <div className="col-span-3">Concessionária Preferida</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue mx-auto"></div>
                <p className="text-gray-500 mt-3">Carregando clientes...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-red-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                <p>Erro ao carregar clientes. Por favor, tente novamente.</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </p>
                {!search && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="mt-4 vw-button-primary inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Primeiro Cliente
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">
                        {customer.name}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {customerService.formatPhone(customer.phone)}
                      </span>
                    </div>
                    <div className="col-span-3">
                      {customer.preferred_dealer_cnpj ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-700">
                            {getDealerName(customer.preferred_dealer_cnpj)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Nenhuma</span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(customer)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(customer)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Table Footer */}
          {filteredCustomers.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Exibindo {filteredCustomers.length} de {customers.length} clientes
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  {isEditMode ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                        placeholder="Digite o nome completo"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent ${
                          phoneError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        required
                      />
                    </div>
                    {phoneError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {phoneError}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Formato: (XX) 9XXXX-XXXX
                    </p>
                  </div>

                  {/* Preferred Dealer Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Concessionária Preferida (Opcional)
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={formData.preferred_dealer_cnpj}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferred_dealer_cnpj: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent appearance-none"
                      >
                        <option value="">Nenhuma selecionada</option>
                        {dealers.map(dealer => (
                          <option key={dealer.id} value={dealer.business_id}>
                            {dealer.name} - {dealer.city}/{dealer.state}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 vw-button-secondary"
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 vw-button-primary flex items-center justify-center gap-2"
                    disabled={
                      createCustomerMutation.isPending ||
                      updateCustomerMutation.isPending ||
                      !!phoneError
                    }
                  >
                    {(createCustomerMutation.isPending || updateCustomerMutation.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        {isEditMode ? 'Atualizar' : 'Criar'} Cliente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Dialog Header */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h2>
                    <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
              </div>

              {/* Dialog Body */}
              <div className="p-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o cliente{' '}
                  <span className="font-semibold">{selectedCustomer.name}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Telefone: {customerService.formatPhone(selectedCustomer.phone)}
                </p>
              </div>

              {/* Dialog Footer */}
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setSelectedCustomer(null)
                  }}
                  className="flex-1 vw-button-secondary"
                  disabled={deleteCustomerMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={deleteCustomerMutation.isPending}
                >
                  {deleteCustomerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Excluir Cliente
                    </>
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
