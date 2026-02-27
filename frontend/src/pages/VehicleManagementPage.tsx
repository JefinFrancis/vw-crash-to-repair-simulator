import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car,
  Plus,
  Search,
  Trash2,
  Eye,
  Pencil,
  X,
  Calendar,
  Hash,
  Settings,
  User,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { vehicleService } from '../services/vehicleService'
import { customerService, Customer } from '../services/customerService'
import { Vehicle, VehicleCreate } from '../types'
import toast from 'react-hot-toast'

interface VehicleFormData {
  model: string
  year: string
  vin: string
  beamng_model: string
  customer_id: string
}

export function VehicleManagementPage() {
  const [search, setSearch] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formData, setFormData] = useState<VehicleFormData>({
    model: '',
    year: new Date().getFullYear().toString(),
    vin: '',
    beamng_model: '',
    customer_id: ''
  })

  const queryClient = useQueryClient()

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 100 }),
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => customerService.list({ limit: 100 }),
  })

  const createVehicleMutation = useMutation({
    mutationFn: (data: VehicleCreate) => vehicleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo criado com sucesso!')
      handleCloseCreateModal()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar veículo')
    },
  })

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleCreate> }) =>
      vehicleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo atualizado com sucesso!')
      setShowEditModal(false)
      setSelectedVehicle(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar veículo')
    },
  })

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => vehicleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo excluído com sucesso!')
      setShowDeleteDialog(false)
      setSelectedVehicle(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir veículo')
    },
  })

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.model.toLowerCase().includes(search.toLowerCase()) ||
    (vehicle.vin && vehicle.vin.toLowerCase().includes(search.toLowerCase())) ||
    (vehicle.beamng_model && vehicle.beamng_model.toLowerCase().includes(search.toLowerCase()))
  )

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowDetails(true)
  }

  const handleOpenCreateModal = () => {
    setFormData({
      model: '',
      year: new Date().getFullYear().toString(),
      vin: '',
      beamng_model: '',
      customer_id: ''
    })
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setFormData({
      model: '',
      year: new Date().getFullYear().toString(),
      vin: '',
      beamng_model: '',
      customer_id: ''
    })
  }

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData({
      model: vehicle.model,
      year: vehicle.year.toString(),
      vin: vehicle.vin || '',
      beamng_model: vehicle.beamng_model || '',
      customer_id: vehicle.customer_id || ''
    })
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedVehicle(null)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return

    if (!formData.model.trim()) {
      toast.error('Modelo é obrigatório')
      return
    }

    const year = parseInt(formData.year, 10)
    if (isNaN(year) || year < 1900 || year > 2030) {
      toast.error('Ano inválido')
      return
    }

    if (formData.vin && formData.vin.length !== 17) {
      toast.error('VIN deve ter exatamente 17 caracteres')
      return
    }

    updateVehicleMutation.mutate({
      id: selectedVehicle.id,
      data: {
        model: formData.model.trim(),
        year,
        vin: formData.vin.trim() || undefined!,
        beamng_model: formData.beamng_model.trim() || undefined,
        customer_id: formData.customer_id || undefined,
      }
    })
  }

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedVehicle) {
      deleteVehicleMutation.mutate(selectedVehicle.id)
    }
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.model.trim()) {
      toast.error('Modelo é obrigatório')
      return
    }

    const year = parseInt(formData.year, 10)
    if (isNaN(year) || year < 1900 || year > 2030) {
      toast.error('Ano inválido')
      return
    }

    if (formData.vin && formData.vin.length !== 17) {
      toast.error('VIN deve ter exatamente 17 caracteres')
      return
    }

    const submitData: VehicleCreate = {
      model: formData.model.trim(),
      year,
      vin: formData.vin.trim() || undefined!,
      beamng_model: formData.beamng_model.trim() || undefined,
      customer_id: formData.customer_id || undefined,
    }

    createVehicleMutation.mutate(submitData)
  }

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return null
    const customer = customers.find(c => c.id === customerId)
    return customer ? customer.name : null
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
              <Car className="h-8 w-8" />
              Veículos
            </h1>
            <p className="text-blue-200 mt-2">
              Gerencie os veículos VW disponíveis para simulação de colisão
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
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
                <p className="text-sm text-gray-500">Total de Veículos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {vehicles.filter(v => v.beamng_model).length}
                </p>
                <p className="text-sm text-gray-500">Prontos p/ BeamNG</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Hash className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(vehicles.map(v => v.model)).size}
                </p>
                <p className="text-sm text-gray-500">Modelos Únicos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(vehicles.map(v => v.year)).size}
                </p>
                <p className="text-sm text-gray-500">Anos de Modelo</p>
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
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por modelo, VIN ou modelo BeamNG..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="vw-button-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Adicionar Veículo
          </button>
        </motion.div>

        {/* Vehicle List */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
              <div className="col-span-3">Modelo</div>
              <div className="col-span-1">Ano</div>
              <div className="col-span-3">VIN</div>
              <div className="col-span-2">Proprietário</div>
              <div className="col-span-1">BeamNG</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue mx-auto"></div>
                <p className="text-gray-500 mt-3">Carregando veículos...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-red-500">
                <p>Erro ao carregar veículos. Por favor, tente novamente.</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum veículo encontrado</p>
              </div>
            ) : (
              filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center">
                        <Car className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">
                        {vehicle.make || 'Volkswagen'} {vehicle.model}
                      </span>
                    </div>
                    <div className="col-span-1 text-gray-600">
                      {vehicle.year}
                    </div>
                    <div className="col-span-3 font-mono text-sm text-gray-600">
                      {vehicle.vin || '-'}
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {getCustomerName(vehicle.customer_id) || (
                        <span className="text-gray-400">Sem dono</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      {vehicle.beamng_model ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Não
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(vehicle)}
                        className="p-2 text-gray-400 hover:text-vw-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(vehicle)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(vehicle)}
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

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Exibindo {filteredVehicles.length} de {vehicles.length} veículos
            </p>
          </div>
        </motion.div>
      </div>

      {/* Vehicle Details Modal */}
      <AnimatePresence>
        {showDetails && selectedVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  {selectedVehicle.make || 'Volkswagen'} {selectedVehicle.model}
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Modelo</label>
                    <p className="text-lg font-semibold">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Ano</label>
                    <p className="text-lg font-semibold">{selectedVehicle.year}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">VIN</label>
                    <p className="text-lg font-mono">{selectedVehicle.vin || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Proprietário</label>
                    <p className="text-lg font-semibold">
                      {getCustomerName(selectedVehicle.customer_id) || 'Sem proprietário'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Modelo BeamNG</label>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.beamng_model || 'Não configurado'}
                    </p>
                  </div>
                  {selectedVehicle.beamng_config && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Configuração BeamNG</label>
                      <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto max-h-64">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(JSON.parse(selectedVehicle.beamng_config), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="vw-button-secondary"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Vehicle Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  Novo Veículo
                </h2>
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={createVehicleMutation.isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Ex: Polo, Golf, T-Cross"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      min="1900"
                      max="2030"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VIN (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent font-mono"
                      placeholder="17 caracteres"
                      maxLength={17}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo BeamNG (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.beamng_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, beamng_model: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Ex: vivace"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proprietário <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={formData.customer_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent appearance-none"
                        required
                      >
                        <option value="">Selecione o proprietário</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customerService.formatPhone(customer.phone)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="flex-1 vw-button-secondary"
                    disabled={createVehicleMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 vw-button-primary flex items-center justify-center gap-2"
                    disabled={createVehicleMutation.isPending}
                  >
                    {createVehicleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Veículo'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Vehicle Modal */}
      <AnimatePresence>
        {showEditModal && selectedVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Pencil className="h-6 w-6" />
                  Editar Veículo
                </h2>
                <button
                  onClick={handleCloseEditModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={updateVehicleMutation.isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Ex: Polo, Golf, T-Cross"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      min="1900"
                      max="2030"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VIN (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent font-mono"
                      placeholder="17 caracteres"
                      maxLength={17}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo BeamNG (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.beamng_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, beamng_model: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
                      placeholder="Ex: vivace"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proprietário
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={formData.customer_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent appearance-none"
                      >
                        <option value="">Sem proprietário</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customerService.formatPhone(customer.phone)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 vw-button-secondary"
                    disabled={updateVehicleMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 vw-button-primary flex items-center justify-center gap-2"
                    disabled={updateVehicleMutation.isPending}
                  >
                    {updateVehicleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
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
        {showDeleteDialog && selectedVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
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

              <div className="p-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o veículo{' '}
                  <span className="font-semibold">{selectedVehicle.make || 'Volkswagen'} {selectedVehicle.model} ({selectedVehicle.year})</span>?
                </p>
                {selectedVehicle.vin && (
                  <p className="text-sm text-gray-500 mt-2">VIN: {selectedVehicle.vin}</p>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setSelectedVehicle(null)
                  }}
                  className="flex-1 vw-button-secondary"
                  disabled={deleteVehicleMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={deleteVehicleMutation.isPending}
                >
                  {deleteVehicleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Excluir Veículo
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
