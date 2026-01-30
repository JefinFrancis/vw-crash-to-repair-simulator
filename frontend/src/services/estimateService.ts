import { apiClient } from './api'
import { ComponentDamage, ApiResponse } from '../types'

export interface EstimateRequest {
  vehicle_vin: string
  vehicle_model: string
  vehicle_year: number
  crash_type?: string
  impact_speed_kmh?: number
  component_damages: Array<{
    component_id: string
    component_name: string
    part_number?: string
    damage_type: string
    severity: string
    replacement_required: boolean
    estimated_repair_hours: number
  }>
  dealer_id?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface PartCost {
  part_number: string
  part_name: string
  quantity: number
  unit_price_brl: number
  total_price_brl: number
  availability: string
  estimated_delivery_days: number
}

export interface LaborCost {
  service_type: string
  hours: number
  rate_per_hour_brl: number
  total_cost_brl: number
}

export interface EstimateResponse {
  estimate_id: string
  vehicle_vin: string
  vehicle_model: string
  created_at: string
  valid_until: string
  
  // Cost summary
  total_parts_cost_brl: number
  total_labor_cost_brl: number
  subtotal_brl: number
  tax_brl: number
  total_estimate_brl: number
  
  // Breakdowns
  parts_breakdown: PartCost[]
  labor_breakdown: LaborCost[]
  
  // Timeline
  estimated_repair_days: number
  estimated_completion_date: string
  
  // Additional info
  severity_assessment: string
  repair_priority: string
  notes: string[]
}

export const estimateService = {
  // Calculate repair estimate
  calculate: (request: EstimateRequest): Promise<EstimateResponse> =>
    apiClient.post('/estimates/calculate', request),

  // List estimates
  list: (params?: {
    skip?: number
    limit?: number
    vehicle_vin?: string
  }): Promise<{ items: EstimateResponse[]; total: number }> => {
    const queryParams = new URLSearchParams()
    if (params?.skip) queryParams.set('skip', params.skip.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.vehicle_vin) queryParams.set('vehicle_vin', params.vehicle_vin)
    
    return apiClient.get(`/estimates/?${queryParams.toString()}`)
  },

  // Get estimate by ID
  getById: (estimateId: string): Promise<EstimateResponse> =>
    apiClient.get(`/estimates/${estimateId}`),

  // Approve estimate
  approve: (estimateId: string): Promise<ApiResponse<{ status: string }>> =>
    apiClient.post(`/estimates/${estimateId}/approve`),
}
