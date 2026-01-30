import { apiClient } from './api'
import { 
  Appointment, 
  VehicleInfo,
  PaginatedResponse,
  ApiResponse 
} from '../types'

export const appointmentService = {
  // Check dealer availability
  checkAvailability: (params: {
    dealer_cnpj: string
    service_type: string
    preferred_dates: string[]
    vehicle_data?: VehicleInfo
  }): Promise<ApiResponse<any>> =>
    apiClient.get(`/appointments/dealers/${params.dealer_cnpj}/availability/`, {
      params: {
        service_type: params.service_type,
        preferred_dates: params.preferred_dates,
        vehicle_data: params.vehicle_data
      }
    }),

  // Book appointment
  book: (appointmentData: {
    dealer_cnpj: string
    service_type: string
    appointment_date: string
    appointment_time: string
    estimated_duration_hours?: number
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    notes?: string
    customer_info: {
      name: string
      cpf?: string
      cnpj?: string
      phone: string
      email?: string
      preferred_contact: string
    }
    vehicle_info: VehicleInfo
    damage_assessment?: any
    insurance_info?: any
    special_requirements?: string[]
  }): Promise<Appointment> =>
    apiClient.post('/appointments/', appointmentData),

  // Get appointment by booking ID
  getByBookingId: (bookingId: string): Promise<Appointment> =>
    apiClient.get(`/appointments/${bookingId}/`),

  // Reschedule appointment
  reschedule: (bookingId: string, params: {
    new_date: string
    new_time: string
    reason?: string
  }): Promise<Appointment> =>
    apiClient.put(`/appointments/${bookingId}/reschedule/`, params),

  // Cancel appointment
  cancel: (bookingId: string, params: {
    reason?: string
    request_refund?: boolean
  }): Promise<ApiResponse<{ cancelled: boolean }>> =>
    apiClient.delete(`/appointments/${bookingId}/`, { data: params }),

  // List appointments
  list: (params?: {
    page?: number
    per_page?: number
    dealer_cnpj?: string
    customer_phone?: string
    status?: string
    date_from?: string
    date_to?: string
  }): Promise<PaginatedResponse<Appointment>> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString())
    if (params?.dealer_cnpj) queryParams.set('dealer_cnpj', params.dealer_cnpj)
    if (params?.customer_phone) queryParams.set('customer_phone', params.customer_phone)
    if (params?.status) queryParams.set('status', params.status)
    if (params?.date_from) queryParams.set('date_from', params.date_from)
    if (params?.date_to) queryParams.set('date_to', params.date_to)
    
    return apiClient.get(`/appointments/?${queryParams.toString()}`)
  },
}