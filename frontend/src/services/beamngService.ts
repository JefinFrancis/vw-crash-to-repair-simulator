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

export interface CrashEventSubmission {
  event_type: string
  timestamp: number
  timestamp_iso?: string
  vehicle: {
    id: number | string
    name: string
    model: string
    brand: string
    year?: number
    plate?: string
  }
  position: {
    x: number
    y: number
    z: number
  }
  velocity: {
    x: number
    y: number
    z: number
    speed_ms: number
    speed_kmh: number
    speed_mph: number
  }
  damage: {
    total_damage: number
    previous_damage?: number
    damage_delta: number
    part_damage: Record<string, number>
    damage_by_zone?: {
      front: number
      rear: number
      left: number
      right: number
      top: number
      bottom: number
    }
    broken_parts: string[]
    broken_parts_count: number
    damaged_parts_count: number
    total_parts_count: number
    parts: Array<{
      name: string
      partId: string
      damage: number
    }>
  }
  metadata: {
    mod_version: string
    beamng_version: string
    damage_threshold: number
  }
}

export interface CrashEventResponse {
  success: boolean
  crash_id: string
  message: string
  damage_summary: Record<string, any>
  estimate_available: boolean
  estimate_url?: string
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

  // Submit a crash event (for simulated crashes)
  submitCrashEvent: (crashEvent: CrashEventSubmission): Promise<CrashEventResponse> =>
    apiClient.post('/beamng/crash-event', crashEvent),
}