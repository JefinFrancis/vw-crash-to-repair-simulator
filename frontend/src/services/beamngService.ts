import { apiClient } from './api'
import { ApiResponse } from '../types'

export interface LatestCrashResponse {
  has_crash: boolean
  crash_id?: string
  crash_time?: string
  vehicle_model?: string
  total_damage?: number
  damage_by_zone?: Record<string, number>
  broken_parts_count?: number
  speed_at_impact?: number
  estimate_ready?: boolean
}

export interface CrashHistoryResponse {
  total: number
  limit: number
  offset: number
  crashes: any[]
}

/**
 * BeamNG Service - Webhook-based crash detection
 * 
 * Note: This service uses HTTP webhooks to receive crash data from BeamNG.
 * The Lua mod in BeamNG sends crash data via HTTP POST to the backend.
 * No active WebSocket connection to BeamNG is required.
 */
export const beamngService = {
  // Get latest crash from BeamNG mod (webhook-received data)
  getLatestCrash: (): Promise<LatestCrashResponse> =>
    apiClient.get('/beamng/latest-crash'),

  // Get crash history
  getCrashHistory: (limit: number = 10, offset: number = 0): Promise<CrashHistoryResponse> =>
    apiClient.get(`/beamng/crash-history?limit=${limit}&offset=${offset}`),

  // Get specific crash by ID
  getCrashById: (crashId: string): Promise<any> =>
    apiClient.get(`/beamng/crash/${crashId}`),
}