import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Search,
  Filter,
  Eye,
  X,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Tag
} from 'lucide-react'
import { partService } from '../services/partService'
import { Part } from '../types'

// Format currency in BRL
const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

// Get display name: prefer Portuguese, fallback to English
const getDisplayName = (part: Part) => part.name_pt || part.name

const categoryLabels: Record<string, string> = {
  engine: 'Motor',
  transmission: 'Transmissão',
  exhaust: 'Escapamento',
  fuel_system: 'Combustível',
  cooling: 'Arrefecimento',
  lighting: 'Iluminação',
  suspension: 'Suspensão',
  steering: 'Direção',
  driveshaft: 'Transmissão/Eixo',
  interior: 'Interior',
  glass: 'Vidros',
  body: 'Carroceria',
  general: 'Geral',
}

const availabilityColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  low_stock: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  discontinued: 'bg-gray-100 text-gray-800',
}

const availabilityLabels: Record<string, string> = {
  available: 'Em Estoque',
  low_stock: 'Estoque Baixo',
  out_of_stock: 'Sem Estoque',
  discontinued: 'Descontinuado',
}

export function PartsPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const { data: parts = [], isLoading, error } = useQuery({
    queryKey: ['parts', selectedCategory],
    queryFn: () => partService.list({
      per_page: 100,
      category: selectedCategory || undefined
    }),
  })

  // Filter parts based on search (search both English and Portuguese names)
  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(search.toLowerCase()) ||
    (part.name_pt && part.name_pt.toLowerCase().includes(search.toLowerCase())) ||
    part.part_number.toLowerCase().includes(search.toLowerCase()) ||
    (part.description && part.description.toLowerCase().includes(search.toLowerCase()))
  )

  // Get unique categories
  const categories = [...new Set(parts.map(p => p.category).filter((c): c is string => !!c))]

  const handleViewDetails = (part: Part) => {
    setSelectedPart(part)
    setShowDetails(true)
  }

  // Calculate stats
  const totalValue = parts.reduce((sum, p) => sum + parseFloat(p.price_brl || '0'), 0)
  const availableParts = parts.filter(p => p.availability_status === 'available').length

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
              <Wrench className="h-8 w-8" />
              Catálogo de Peças VW
            </h1>
            <p className="text-blue-200 mt-2">
              Consulte e gerencie o inventário de peças genuínas Volkswagen
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
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
                <p className="text-sm text-gray-500">Total de Peças</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{availableParts}</p>
                <p className="text-sm text-gray-500">Em Estoque</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                <p className="text-sm text-gray-500">Categorias</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                <p className="text-sm text-gray-500">Valor Total</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome da peça ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent appearance-none bg-white min-w-[200px]"
              >
                <option value="">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat] || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Parts Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <div className="col-span-full py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue mx-auto"></div>
              <p className="text-gray-500 mt-3">Carregando peças...</p>
            </div>
          ) : error ? (
            <div className="col-span-full py-12 text-center text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
              <p>Erro ao carregar peças. Tente novamente.</p>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma peça encontrada</p>
            </div>
          ) : (
            filteredParts.map((part, index) => (
              <motion.div
                key={part.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(part)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{getDisplayName(part)}</h3>
                        <p className="text-sm text-gray-500 font-mono">{part.part_number}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${availabilityColors[part.availability_status || 'available']}`}>
                      {availabilityLabels[part.availability_status || 'available'] || part.availability_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-vw-blue">
                        {formatCurrency(part.price_brl)}
                      </span>
                      {part.labor_hours && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {part.labor_hours}h
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(part)
                      }}
                      className="p-2 text-gray-400 hover:text-vw-blue hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Results count */}
        {!isLoading && !error && (
          <motion.div
            className="mt-6 text-center text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Mostrando {filteredParts.length} de {parts.length} peças
          </motion.div>
        )}
      </div>

      {/* Part Details Modal */}
      <AnimatePresence>
        {showDetails && selectedPart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-vw-blue text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Wrench className="h-6 w-6" />
                  Detalhes da Peça
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nome da Peça</label>
                    <p className="text-lg font-semibold">{getDisplayName(selectedPart)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Número da Peça</label>
                      <p className="font-mono text-gray-900">{selectedPart.part_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Categoria</label>
                      <p className="text-gray-900">{categoryLabels[selectedPart.category || ''] || selectedPart.category}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Preço</label>
                      <p className="text-2xl font-bold text-vw-blue">{formatCurrency(selectedPart.price_brl)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Tempo de Mão de Obra</label>
                      <p className="text-lg font-semibold">{selectedPart.labor_hours || '0'}h</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Disponibilidade</label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availabilityColors[selectedPart.availability_status || 'available']}`}>
                        {availabilityLabels[selectedPart.availability_status || 'available'] || selectedPart.availability_status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Fornecedor</label>
                      <p className="text-gray-900">{selectedPart.supplier || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="vw-button-primary"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
