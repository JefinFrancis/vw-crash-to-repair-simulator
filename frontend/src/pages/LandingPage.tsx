import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Zap, ArrowRight, Loader2, Check, Calendar, FileText } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { vehicleService } from '../services/vehicleService'
import { Vehicle } from '../types'
import { motion } from 'framer-motion'

export function LandingPage() {
  const navigate = useNavigate()
  const { setCurrentScreen, selectedVehicle, setSelectedVehicle } = useAppStore()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsLoading(true)
        const data = await vehicleService.list()
        setVehicles(data)
      } catch (err) {
        console.error('Failed to fetch vehicles:', err)
        setError('Erro ao carregar veículos')
      } finally {
        setIsLoading(false)
      }
    }
    fetchVehicles()
  }, [])

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleStartSimulation = () => {
    if (selectedVehicle) {
      setCurrentScreen('results')
      navigate('/results')
    }
  }

  // Vehicle images mapping (placeholder colors for demo)
  const vehicleColors: Record<string, string> = {
    'T-Cross': 'from-blue-500 to-blue-700',
    'Golf': 'from-red-500 to-red-700',
    'Polo': 'from-gray-500 to-gray-700',
    'Virtus': 'from-green-500 to-green-700',
    'Nivus': 'from-orange-500 to-orange-700',
    'Taos': 'from-purple-500 to-purple-700',
    'Tiguan': 'from-teal-500 to-teal-700',
    'Jetta': 'from-indigo-500 to-indigo-700',
  }

  const getVehicleGradient = (model: string) => {
    return vehicleColors[model] || 'from-vw-blue to-vw-blue-dark'
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-vw-blue mx-auto mb-4" />
          <p className="text-gray-600">Carregando veículos...</p>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Car className="h-8 w-8" />
              Selecione seu Veículo
            </h1>
            <p className="text-blue-200 mt-2">
              Escolha um veículo VW para iniciar a experiência de simulação
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Selected Vehicle Banner */}
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-green-50 border-2 border-green-200 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Veículo Selecionado</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedVehicle.model}</p>
                  <p className="text-gray-500">Ano: {selectedVehicle.year} • VIN: ...{selectedVehicle.vin.slice(-6)}</p>
                </div>
              </div>
              <motion.button
                onClick={handleStartSimulation}
                className="flex items-center gap-3 px-8 py-4 bg-vw-blue text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FileText className="h-6 w-6" />
                Ver Sinistros
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle, index) => {
            const isSelected = selectedVehicle?.id === vehicle.id
            return (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectVehicle(vehicle)}
                className={`relative cursor-pointer rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ${
                  isSelected ? 'ring-4 ring-vw-blue ring-offset-2' : ''
                }`}
              >
                {/* Vehicle Image/Gradient */}
                <div className={`h-48 bg-gradient-to-br ${getVehicleGradient(vehicle.model)} flex items-center justify-center`}>
                  <Car className="h-24 w-24 text-white opacity-50" />
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-vw-blue" />
                    </div>
                  )}
                </div>
                
                {/* Vehicle Info */}
                <div className="bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {vehicle.model}
                      </h3>
                      <p className="text-gray-500">Ano {vehicle.year}</p>
                    </div>
                    <div className="bg-vw-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                      VW
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">VIN</span>
                      <span className="font-mono text-gray-700">...{vehicle.vin.slice(-8)}</span>
                    </div>
                    {vehicle.beamng_model && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500">BeamNG Model</span>
                        <span className="text-gray-700">{vehicle.beamng_model}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    className={`w-full mt-4 py-3 rounded-xl font-semibold transition-all ${
                      isSelected
                        ? 'bg-vw-blue text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? 'Selecionado' : 'Selecionar'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Empty State */}
        {vehicles.length === 0 && !error && (
          <div className="text-center py-16">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum veículo disponível</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <button
              onClick={handleStartSimulation}
              className="flex items-center justify-center gap-3 p-4 bg-vw-blue text-white rounded-xl hover:bg-vw-blue-dark transition-colors"
            >
              <Zap className="h-5 w-5" />
              Ir para Simulação
            </button>
            <button
              onClick={() => navigate('/results')}
              className="flex items-center justify-center gap-3 p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-vw-blue hover:text-vw-blue transition-colors"
            >
              <Car className="h-5 w-5" />
              Ver Sinistros do Veículo
            </button>
            <button
              onClick={() => navigate('/appointment')}
              className="flex items-center justify-center gap-3 p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-vw-blue hover:text-vw-blue transition-colors"
            >
              <Calendar className="h-5 w-5" />
              Agendar Serviço
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
