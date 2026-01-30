import { apiClient } from './api'
import { 
  Vehicle, 
  VehicleCreate, 
  ApiResponse 
} from '../types'

export const vehicleService = {
  // List vehicles with optional filtering - returns array directly
  list: (params?: {
    page?: number
    per_page?: number
    make?: string
    year_min?: number
    year_max?: number
    vin_search?: string
  }): Promise<Vehicle[]> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString())
    if (params?.make) queryParams.set('make', params.make)
    if (params?.year_min) queryParams.set('year_min', params.year_min.toString())
    if (params?.year_max) queryParams.set('year_max', params.year_max.toString())
    if (params?.vin_search) queryParams.set('vin_search', params.vin_search)
    
    return apiClient.get(`/vehicles/?${queryParams.toString()}`)
  },

  // Create new vehicle
  create: (vehicleData: VehicleCreate): Promise<Vehicle> =>
    apiClient.post('/vehicles/', vehicleData),

  // Get vehicle by ID
  getById: (vehicleId: string): Promise<Vehicle> =>
    apiClient.get(`/vehicles/${vehicleId}/`),

  // Get vehicle by VIN
  getByVin: (vin: string): Promise<Vehicle> =>
    apiClient.get(`/vehicles/vin/${vin}/`),

  // Update vehicle
  update: (vehicleId: string, vehicleData: Partial<VehicleCreate>): Promise<Vehicle> =>
    apiClient.put(`/vehicles/${vehicleId}/`, vehicleData),

  // Delete vehicle
  delete: (vehicleId: string): Promise<void> =>
    apiClient.delete(`/vehicles/${vehicleId}/`),

  // Validate VIN
  validateVin: (vehicleId: string, vin: string): Promise<ApiResponse<{ valid: boolean; details: any }>> =>
    apiClient.post(`/vehicles/${vehicleId}/validate-vin/`, { vin }),

  // Get BeamNG status for vehicle
  getBeamNGStatus: (vehicleId: string): Promise<ApiResponse<any>> =>
    apiClient.get(`/vehicles/${vehicleId}/beamng-status/`),
}