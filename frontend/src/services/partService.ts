import { apiClient } from './api'
import { 
  Part, 
  RepairCostEstimate,
  ApiResponse,
  ComponentDamage 
} from '../types'

export const partService = {
  // List parts with optional filtering - API returns array directly
  list: (params?: {
    page?: number
    per_page?: number
    category?: string
    part_number_search?: string
    availability_status?: string
  }): Promise<Part[]> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString())
    if (params?.category) queryParams.set('category', params.category)
    if (params?.part_number_search) queryParams.set('part_number_search', params.part_number_search)
    if (params?.availability_status) queryParams.set('availability_status', params.availability_status)
    
    return apiClient.get(`/parts/?${queryParams.toString()}`)
  },

  // Get part by ID
  getById: (partId: string): Promise<Part> =>
    apiClient.get(`/parts/${partId}/`),

  // Estimate repair cost
  estimateRepairCost: (params: {
    vehicle_vin?: string
    component_damages: ComponentDamage[]
    region?: string
    labor_rate_modifier?: number
  }): Promise<RepairCostEstimate> =>
    apiClient.post('/parts/repair-cost-estimate/', params),

  // Validate VW part number
  validatePartNumber: (partNumber: string): Promise<ApiResponse<{ valid: boolean; details: any }>> =>
    apiClient.post('/parts/validate-part-number/', { part_number: partNumber }),

  // Get parts categories
  getCategories: (): Promise<ApiResponse<string[]>> =>
    apiClient.get('/parts/categories/'),
}