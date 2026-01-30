import { apiClient } from './api'
import { BeamNGConnection, BeamNGTelemetry, ApiResponse } from '../types'

export const beamngService = {
  // Connect to BeamNG
  connect: (params: {
    host?: string
    port?: number
    timeout?: number
  } = {}): Promise<ApiResponse<BeamNGConnection>> =>
    apiClient.post('/beamng/connect/', params),

  // Disconnect from BeamNG
  disconnect: (): Promise<ApiResponse<{ disconnected: boolean }>> =>
    apiClient.post('/beamng/disconnect/'),

  // Load vehicle scenario
  loadScenario: (params: {
    vehicle_model: string
    scenario_name?: string
    spawn_point?: any
    weather?: string
    time_of_day?: string
  }): Promise<ApiResponse<{ scenario_loaded: boolean; vehicle_id: string }>> =>
    apiClient.post('/beamng/scenario/', params),

  // Execute crash simulation
  executeCrash: (params: {
    vehicle_id: string
    crash_type: string
    target_speed_kmh: number
    impact_angle?: number
    obstacle_type?: string
    record_telemetry?: boolean
  }): Promise<ApiResponse<{ crash_executed: boolean; simulation_id: string }>> =>
    apiClient.post('/beamng/crash/', params),

  // Get telemetry data
  getTelemetry: (params: {
    vehicle_id?: string
    simulation_id?: string
    start_time?: string
    end_time?: string
    include_damage?: boolean
  }): Promise<ApiResponse<BeamNGTelemetry[]>> =>
    apiClient.get('/beamng/telemetry/', { params }),

  // Generate damage report from telemetry
  generateDamageReport: (params: {
    simulation_id: string
    vehicle_model: string
    analysis_level?: 'basic' | 'detailed' | 'comprehensive'
  }): Promise<ApiResponse<any>> =>
    apiClient.post('/beamng/damage-report/', params),

  // Get connection health
  getHealth: (): Promise<BeamNGConnection> =>
    apiClient.get('/beamng/health/'),

  // Reset vehicle
  resetVehicle: (vehicleId: string): Promise<ApiResponse<{ reset: boolean }>> =>
    apiClient.post(`/beamng/vehicles/${vehicleId}/reset/`),

  // Get available scenarios
  getScenarios: (): Promise<ApiResponse<Array<{
    name: string
    description: string
    vehicle_types: string[]
    difficulty: string
  }>>> =>
    apiClient.get('/beamng/scenarios/'),

  // Get available vehicles
  getVehicles: (): Promise<ApiResponse<Array<{
    model: string
    name: string
    year: number
    category: string
    beamng_id: string
  }>>> =>
    apiClient.get('/beamng/vehicles/'),
}