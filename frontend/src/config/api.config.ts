/**
 * API Configuration
 * 
 * Centralizes all API-related configuration to handle various environment setups:
 * - Development: localhost with or without /api/v1 suffix
 * - Docker: Internal container networking
 * - Production: Full production URLs
 * 
 * Supports two configuration patterns:
 * 1. Full URL: VITE_API_URL=http://localhost:8000/api/v1
 * 2. Split URL: VITE_API_URL=http://localhost:8000 + VITE_API_PREFIX=/api/v1
 */

// Default values
const DEFAULT_API_URL = 'http://localhost:8000'
const DEFAULT_API_PREFIX = '/api/v1'

/**
 * Normalizes the API URL by removing trailing slashes
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Normalizes the API prefix by ensuring it starts with / and has no trailing slash
 */
function normalizePrefix(prefix: string): string {
  const normalized = prefix.replace(/\/+$/, '')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

/**
 * Builds the complete API base URL from environment variables
 * 
 * Logic:
 * 1. If VITE_API_URL already contains /api/, use it as-is (full URL pattern)
 * 2. Otherwise, combine VITE_API_URL + VITE_API_PREFIX (split pattern)
 */
function buildApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL
  const apiPrefix = import.meta.env.VITE_API_PREFIX || DEFAULT_API_PREFIX
  
  const normalizedUrl = normalizeUrl(apiUrl)
  
  // Check if URL already contains an API path (e.g., /api/v1, /api/v2)
  if (/\/api(\/|$)/.test(normalizedUrl)) {
    // URL already has API path - use as-is
    return normalizedUrl
  }
  
  // Combine base URL with prefix
  const normalizedPrefix = normalizePrefix(apiPrefix)
  return `${normalizedUrl}${normalizedPrefix}`
}

/**
 * API Configuration object
 */
export const apiConfig = {
  /** Complete API base URL (e.g., http://localhost:8000/api/v1) */
  baseUrl: buildApiBaseUrl(),
  
  /** Raw API URL from environment (without prefix) */
  rawApiUrl: normalizeUrl(import.meta.env.VITE_API_URL || DEFAULT_API_URL),
  
  /** API prefix path (e.g., /api/v1) */
  apiPrefix: normalizePrefix(import.meta.env.VITE_API_PREFIX || DEFAULT_API_PREFIX),
  
  /** Request timeout in milliseconds */
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  
  /** Whether we're in development mode */
  isDev: import.meta.env.DEV,
  
  /** Whether to enable request/response logging */
  enableLogging: import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true',
}

export default apiConfig
