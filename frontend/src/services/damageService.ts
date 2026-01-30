import { apiClient } from './api'
import { 
  DamageAssessment, 
  CrashData,
  PaginatedResponse,
  ApiResponse 
} from '../types'

export const damageService = {
  // Analyze crash from BeamNG data
  analyzeCrash: (crashData: {
    simulation_data: any
    vehicle_model: string
    analysis_depth?: 'basic' | 'standard' | 'detailed' | 'forensic'
    include_repair_estimate?: boolean
  }): Promise<ApiResponse<any>> =>
    apiClient.post('/damage-reports/analyze/', crashData),

  // Get damage report by ID
  getById: (reportId: string): Promise<DamageAssessment> =>
    apiClient.get(`/damage-reports/${reportId}/`),

  // Generate damage report
  generateReport: (params: {
    vehicle_vin: string
    crash_data?: CrashData
    damage_zones: any[]
    component_damages: any[]
    assessor_name: string
    assessment_type?: string
  }): Promise<DamageAssessment> =>
    apiClient.post('/damage-reports/generate/', params),

  // Get repair recommendations
  getRecommendations: (reportId: string): Promise<ApiResponse<any>> =>
    apiClient.get(`/damage-reports/${reportId}/recommendations/`),

  // List damage reports
  list: (params?: {
    page?: number
    per_page?: number
    vehicle_vin?: string
    severity?: string
    date_from?: string
    date_to?: string
  }): Promise<PaginatedResponse<DamageAssessment>> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString())
    if (params?.vehicle_vin) queryParams.set('vehicle_vin', params.vehicle_vin)
    if (params?.severity) queryParams.set('severity', params.severity)
    if (params?.date_from) queryParams.set('date_from', params.date_from)
    if (params?.date_to) queryParams.set('date_to', params.date_to)
    
    return apiClient.get(`/damage-reports/?${queryParams.toString()}`)
  },
}