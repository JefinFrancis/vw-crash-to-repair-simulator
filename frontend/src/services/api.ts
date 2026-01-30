import axios, { AxiosResponse } from 'axios'
import toast from 'react-hot-toast'
import { ApiResponse, ApiError } from '../types'
import { apiConfig } from '../config/api.config'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log requests in development
    if (apiConfig.enableLogging) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (apiConfig.enableLogging) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  (error) => {
    // Log errors in development
    if (apiConfig.enableLogging) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error)
    }
    
    // Handle common errors
    const apiError: ApiError = {
      message: 'Unknown error',
      code: 'UNKNOWN_ERROR',
    }
    
    if (error.response) {
      // Server responded with error
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          apiError.message = data.detail || 'Invalid data'
          apiError.code = 'BAD_REQUEST'
          break
        case 401:
          apiError.message = 'Unauthorized'
          apiError.code = 'UNAUTHORIZED'
          // Clear auth token
          localStorage.removeItem('authToken')
          break
        case 403:
          apiError.message = 'Access denied'
          apiError.code = 'FORBIDDEN'
          break
        case 404:
          apiError.message = 'Resource not found'
          apiError.code = 'NOT_FOUND'
          break
        case 422:
          apiError.message = data.detail?.[0]?.msg || 'Validation error'
          apiError.code = 'VALIDATION_ERROR'
          apiError.details = data.detail
          break
        case 500:
          apiError.message = 'Internal server error'
          apiError.code = 'INTERNAL_ERROR'
          break
        default:
          apiError.message = data.detail || `Error ${status}`
          apiError.code = `HTTP_${status}`
      }
    } else if (error.request) {
      // Network error
      apiError.message = 'Connection error. Check your internet connection.'
      apiError.code = 'NETWORK_ERROR'
    }
    
    // Show error toast for user-facing errors
    if (!error.config?.headers?.['x-silent-error']) {
      toast.error(apiError.message)
    }
    
    return Promise.reject(apiError)
  }
)

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: any): Promise<T> =>
    api.get(url, config).then(response => response.data),
    
  post: <T>(url: string, data?: any, config?: any): Promise<T> =>
    api.post(url, data, config).then(response => response.data),
    
  put: <T>(url: string, data?: any, config?: any): Promise<T> =>
    api.put(url, data, config).then(response => response.data),
    
  delete: <T>(url: string, config?: any): Promise<T> =>
    api.delete(url, config).then(response => response.data),
    
  patch: <T>(url: string, data?: any, config?: any): Promise<T> =>
    api.patch(url, data, config).then(response => response.data),
}

export default api