/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_API_PREFIX: string
  readonly VITE_API_TIMEOUT: string
  
  // BeamNG Configuration
  readonly VITE_BEAMNG_HOST: string
  readonly VITE_BEAMNG_PORT: string
  readonly VITE_BEAMNG_ENABLED: string
  
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_DEBUG: string
  
  // Brazilian Settings
  readonly VITE_CURRENCY: string
  readonly VITE_LANGUAGE: string
  readonly VITE_TIMEZONE: string
  
  // Feature Flags
  readonly VITE_ENABLE_DEMO_MODE: string
  readonly VITE_ENABLE_TELEMETRY: string
  readonly VITE_ENABLE_REALTIME: string
  
  // Vite Built-ins
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
