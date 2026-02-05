import { useState } from 'react'
import { X, Car, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { vehicleService } from '../services/vehicleService'
import { Vehicle } from '../types'
import { motion, AnimatePresence } from 'framer-motion'

interface VehicleSelectorProps {
  onSelect: (vehicle: Vehicle) => void
  onClose: () => void
}

export function VehicleSelector({ onSelect, onClose }: VehicleSelectorProps) {
  const [search, setSearch] = useState('')
  
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 50 }),
  })
  
  // Filter vehicles based on search - API returns array directly
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.model.toLowerCase().includes(search.toLowerCase()) ||
    vehicle.vin.toLowerCase().includes(search.toLowerCase()) ||
    (vehicle.beamng_model && vehicle.beamng_model.toLowerCase().includes(search.toLowerCase()))
  )
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-vw-blue">Selecionar Veículo</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Search */}
          <div className="p-6 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por marca, modelo ou VIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="vw-input pl-10"
              />
            </div>
          </div>
          
          {/* Vehicle List */}
          <div className="p-6 overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue"></div>
                <span className="ml-3 text-gray-600">Carregando veículos...</span>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhum veículo encontrado</p>
                <p className="text-sm">Tente ajustar sua busca ou cadastre um novo veículo</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredVehicles.map((vehicle) => (
                  <motion.div
                    key={vehicle.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                    onClick={() => onSelect(vehicle)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-vw-blue rounded-lg flex items-center justify-center">
                        <Car className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {vehicle.model}
                        </h3>
                        <p className="text-gray-600">
                          Ano: {vehicle.year} • VIN: {vehicle.vin}
                        </p>
                        {vehicle.beamng_model && (
                          <p className="text-sm text-vw-blue">
                            BeamNG: {vehicle.beamng_model}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button className="vw-button-primary">
                      Selecionar
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {filteredVehicles.length} veículo(s) encontrado(s)
              </p>
              <button 
                onClick={onClose}
                className="vw-button-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}