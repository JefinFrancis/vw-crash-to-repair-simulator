import { apiClient } from './api'
import { 
  Dealer, 
  ApiResponse 
} from '../types'

export const dealerService = {
  // List dealers with optional filtering - API returns array directly
  list: (params?: {
    page?: number
    per_page?: number
    state?: string
    city?: string
    services?: string[]
  }): Promise<Dealer[]> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString())
    if (params?.state) queryParams.set('state', params.state)
    if (params?.city) queryParams.set('city', params.city)
    if (params?.services) {
      params.services.forEach(service => queryParams.append('services', service))
    }
    
    return apiClient.get(`/dealers/?${queryParams.toString()}`)
  },

  // Create a new dealer
  create: (data: {
    name: string
    cnpj: string
    address: string
    city: string
    state: string
    postal_code: string
    phone: string
    email?: string
  }): Promise<Dealer> => apiClient.post('/dealers/', data),

  // Search nearby dealers
  searchNearby: (params: {
    latitude: number
    longitude: number
    radius_km?: number
    services?: string[]
    limit?: number
  }): Promise<Array<Dealer & { distance_km: number }>> => {
    return apiClient.get('/dealers/search/nearby/', { params })
  },

  // Validate business ID
  validateBusinessId: (businessId: string): Promise<ApiResponse<{ valid: boolean; details: any }>> =>
    apiClient.get(`/dealers/${businessId}/validate/`),

  // Get dealer performance metrics
  getPerformance: (businessId: string): Promise<ApiResponse<any>> =>
    apiClient.get(`/dealers/${businessId}/performance/`),

  // Get dealer by business ID
  getByBusinessId: (businessId: string): Promise<Dealer> =>
    apiClient.get(`/dealers/${businessId}/`),

  // Get dealer by UUID
  getById: (id: string): Promise<Dealer> =>
    apiClient.get(`/dealers/${id}`),
}