import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AppState, Vehicle, DamageAssessment, Appointment, BeamNGConnection } from '../types'

interface AppStore extends AppState {
  // Actions for app state
  setLoading: (loading: boolean) => void
  setCurrentScreen: (screen: AppState['currentScreen']) => void
  
  // BeamNG actions
  setBeamNGConnection: (connection: BeamNGConnection) => void
  updateBeamNGStatus: (status: BeamNGConnection['status']) => void
  
  // Vehicle actions
  setSelectedVehicle: (vehicle: Vehicle | undefined) => void
  
  // Damage assessment actions
  setCurrentDamageAssessment: (assessment: DamageAssessment | undefined) => void
  
  // Appointment actions
  setCurrentAppointment: (appointment: Appointment | undefined) => void
  
  // Reset actions
  resetState: () => void
  resetWorkflow: () => void
}

const initialState: AppState = {
  isLoading: false,
  currentScreen: 'landing',
  beamng: {
    connected: false,
    host: 'localhost',
    port: 64256,
    status: 'disconnected',
  },
  selectedVehicle: undefined,
  currentDamageAssessment: undefined,
  currentAppointment: undefined,
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setCurrentScreen: (currentScreen) => set({ currentScreen }),
      
      setBeamNGConnection: (beamng) => set({ beamng }),
      
      updateBeamNGStatus: (status) => 
        set((state) => ({
          beamng: { ...state.beamng, status }
        })),
      
      setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
      
      setCurrentDamageAssessment: (currentDamageAssessment) => set({ currentDamageAssessment }),
      
      setCurrentAppointment: (currentAppointment) => set({ currentAppointment }),
      
      resetState: () => set(initialState),
      
      resetWorkflow: () => set((state) => ({
        ...state,
        currentScreen: 'landing',
        selectedVehicle: undefined,
        currentDamageAssessment: undefined,
        currentAppointment: undefined,
      })),
    }),
    {
      name: 'vw-crash-repair-store',
    }
  )
)