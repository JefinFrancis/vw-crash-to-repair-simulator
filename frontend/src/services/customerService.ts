/**
 * Customer Service
 *
 * Handles all API calls related to customer management
 */

import { apiClient } from './api'

export interface Customer {
  id: string
  name: string
  phone: string  // Brazilian mobile format: 5511999999999
  preferred_dealer_id?: string
  created_at: string
  updated_at: string
}

export interface CustomerCreate {
  name: string
  phone: string
  preferred_dealer_id?: string
}

export interface CustomerUpdate {
  name?: string
  phone?: string
  preferred_dealer_id?: string
}

export const customerService = {
  /**
   * List all customers with optional filtering
   */
  async list(params?: {
    skip?: number
    limit?: number
    name?: string
  }): Promise<Customer[]> {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString())
    if (params?.name) queryParams.set('name', params.name)

    const url = `/customers/?${queryParams.toString()}`
    return apiClient.get<Customer[]>(url)
  },

  /**
   * Get a customer by ID
   */
  async getById(customerId: string): Promise<Customer> {
    return apiClient.get<Customer>(`/customers/${customerId}`)
  },

  /**
   * Get a customer by phone number
   */
  async getByPhone(phone: string): Promise<Customer | null> {
    return apiClient.get<Customer | null>(`/customers/phone/${phone}`)
  },

  /**
   * Create a new customer
   */
  async create(data: CustomerCreate): Promise<Customer> {
    return apiClient.post<Customer>('/customers/', data)
  },

  /**
   * Update a customer
   */
  async update(customerId: string, data: CustomerUpdate): Promise<Customer> {
    return apiClient.put<Customer>(`/customers/${customerId}`, data)
  },

  /**
   * Delete a customer
   */
  async delete(customerId: string): Promise<void> {
    return apiClient.delete(`/customers/${customerId}`)
  },

  /**
   * Get all customers who prefer a specific dealer
   */
  async getByDealer(dealerId: string, params?: {
    skip?: number
    limit?: number
  }): Promise<Customer[]> {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString())

    const url = `/customers/dealer/${dealerId}?${queryParams.toString()}`
    return apiClient.get<Customer[]>(url)
  },

  /**
   * Format Brazilian phone number for display
   * Converts 5511999999999 to +55 (11) 99999-9999
   */
  formatPhone(phone: string): string {
    if (!phone || phone.length !== 13) return phone

    // Remove country code (55)
    const withoutCountry = phone.substring(2)
    // Extract parts: area code (2 digits) + first part (5 digits) + last part (4 digits)
    const areaCode = withoutCountry.substring(0, 2)
    const firstPart = withoutCountry.substring(2, 7)
    const lastPart = withoutCountry.substring(7)

    return `+55 (${areaCode}) ${firstPart}-${lastPart}`
  },

  /**
   * Format phone for input field (without country code, since badge shows +55)
   * Converts 5511999999999 to (11) 99999-9999
   */
  formatPhoneForInput(phone: string): string {
    if (!phone || phone.length !== 13) return phone

    const withoutCountry = phone.substring(2)
    const areaCode = withoutCountry.substring(0, 2)
    const firstPart = withoutCountry.substring(2, 7)
    const lastPart = withoutCountry.substring(7)

    return `(${areaCode}) ${firstPart}-${lastPart}`
  },

  /**
   * Unformat phone number for API submission
   * Converts (11) 99999-9999 to 5511999999999
   */
  unformatPhone(phone: string): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '')

    // If it doesn't start with 55, add country code
    if (!digitsOnly.startsWith('55')) {
      return '55' + digitsOnly
    }

    return digitsOnly
  },

  /**
   * Validate Brazilian mobile phone number
   * Format: 55 + area code (2 digits) + 9 + number (8 digits)
   */
  validatePhone(phone: string): boolean {
    const unformatted = this.unformatPhone(phone)
    const regex = /^55\d{2}9\d{8}$/
    return regex.test(unformatted)
  }
}
