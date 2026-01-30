import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Calendar,
  Hash,
  Settings
} from 'lucide-react'
import { vehicleService } from '../services/vehicleService'
import { Vehicle } from '../types'
import toast from 'react-hot-toast'

export function VehicleManagementPage() {
  const [search, setSearch] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.list({ per_page: 100 }),
  })

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.model.toLowerCase().includes(search.toLowerCase()) ||
    vehicle.vin.toLowerCase().includes(search.toLowerCase()) ||
    (vehicle.beamng_model && vehicle.beamng_model.toLowerCase().includes(search.toLowerCase()))
  )

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowDetails(true)
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Car className="h-8 w-8" />
              Vehicle Management
            </h1>
            <p className="text-blue-200 mt-2">
              Manage VW vehicles available for crash simulation
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
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
              placeholder="Search by model, VIN or BeamNG model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>

          {/* Add Vehicle Button */}
          <button
            onClick={() => toast.success('Vehicle creation coming soon!')}
            className="vw-btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Vehicle
          </button>
        </motion.div>

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
                <p className="text-sm text-gray-500">Total Vehicles</p>
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
                <p className="text-sm text-gray-500">BeamNG Ready</p>
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
                <p className="text-sm text-gray-500">Unique Models</p>
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
                <p className="text-sm text-gray-500">Model Years</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vehicle List */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
              <div className="col-span-3">Model</div>
              <div className="col-span-2">Year</div>
              <div className="col-span-3">VIN</div>
              <div className="col-span-2">BeamNG Model</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue mx-auto"></div>
                <p className="text-gray-500 mt-3">Loading vehicles...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-red-500">
                <p>Error loading vehicles. Please try again.</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No vehicles found</p>
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
                        VW {vehicle.model}
                      </span>
                    </div>
                    <div className="col-span-2 text-gray-600">
                      {vehicle.year}
                    </div>
                    <div className="col-span-3 font-mono text-sm text-gray-600">
                      {vehicle.vin}
                    </div>
                    <div className="col-span-2">
                      {vehicle.beamng_model ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {vehicle.beamng_model}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Not configured
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(vehicle)}
                        className="p-2 text-gray-400 hover:text-vw-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toast.success('Edit coming soon!')}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toast.error('Delete not allowed in demo')}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
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
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
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
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-vw-blue flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  VW {selectedVehicle.model}
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Model</label>
                    <p className="text-lg font-semibold">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Year</label>
                    <p className="text-lg font-semibold">{selectedVehicle.year}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">VIN</label>
                    <p className="text-lg font-mono">{selectedVehicle.vin}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">BeamNG Model</label>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.beamng_model || 'Not configured'}
                    </p>
                  </div>
                  {selectedVehicle.beamng_config && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">BeamNG Configuration</label>
                      <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto max-h-64">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(JSON.parse(selectedVehicle.beamng_config), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="vw-btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => toast.success('Edit coming soon!')}
                  className="vw-btn-primary flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Vehicle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}