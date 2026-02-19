import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Search, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { vehicleService } from '../services/vehicleService'
import { Vehicle } from '../types'
import { motion } from 'framer-motion'

export function LandingPage() {
  const navigate = useNavigate()
  const { selectedVehicle, setSelectedVehicle, setCurrentScreen } = useAppStore()
  const [vehicleSearch, setVehicleSearch] = useState('')

  // Redirect to /results if vehicle is already selected
  useEffect(() => {
    if (selectedVehicle) {
      navigate('/results', { replace: true })
    }
  }, [selectedVehicle, navigate])

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 50 }),
  })

  const filteredVehicles = vehicles.filter(v =>
    v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    (v.make && v.make.toLowerCase().includes(vehicleSearch.toLowerCase()))
  )

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setCurrentScreen('results')
    navigate('/results')
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
              Selecionar Veiculo
            </h1>
            <p className="text-blue-200 mt-2">
              Escolha um veiculo para iniciar a experiencia de colisao
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Search */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por modelo, marca ou VIN..."
              value={vehicleSearch}
              onChange={e => setVehicleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Vehicle List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue"></div>
            <span className="ml-3 text-gray-600">Carregando veiculos...</span>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Car className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg mb-1">Nenhum veiculo encontrado</p>
            <p className="text-sm">
              Cadastre veiculos na pagina de{' '}
              <button onClick={() => navigate('/vehicles')} className="text-vw-blue hover:underline">
                Veiculos
              </button>
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {filteredVehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                className="bg-white p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-vw-blue hover:shadow-md transition-all group"
                onClick={() => handleSelectVehicle(vehicle)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-vw-blue group-hover:text-white text-gray-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">VW {vehicle.model}</p>
                      <p className="text-sm text-gray-500">{vehicle.year} - {vehicle.make || 'Volkswagen'}</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">VIN: {vehicle.vin}</p>
                      {vehicle.beamng_model && (
                        <p className="text-xs text-vw-blue mt-1">BeamNG: {vehicle.beamng_model}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-vw-blue transition-colors flex-shrink-0 mt-2" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Count */}
        <p className="text-center text-gray-400 text-sm mt-6">
          {filteredVehicles.length} veiculo(s) disponivel(is)
        </p>
      </div>
    </div>
  )
}
