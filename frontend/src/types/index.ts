// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

// Vehicle Types
export interface Vehicle {
  id: string;
  model: string;
  year: number;
  vin: string;
  make: string;
  beamng_model?: string;
  beamng_config?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  model: string;
  year: number;
  vin: string;
  make?: string;
  beamng_model?: string;
  beamng_config?: string;
}

// Dealer Types
export interface Dealer {
  id: string;
  name: string;
  business_id: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  services: string[];
  working_hours: WorkingHours;
  performance_metrics: DealerPerformance;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  monday: { open: string; close: string; };
  tuesday: { open: string; close: string; };
  wednesday: { open: string; close: string; };
  thursday: { open: string; close: string; };
  friday: { open: string; close: string; };
  saturday: { open: string; close: string; };
  sunday: { open: string; close: string; };
}

export interface DealerPerformance {
  average_rating: number;
  total_repairs: number;
  average_completion_time_days: number;
  customer_satisfaction_score: number;
}

// Parts Types
export interface Part {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  price_brl: string;
  labor_hours?: string;
  category?: string;
  availability_status?: 'available' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'in_stock' | 'backordered';
  supplier?: string;
  vehicle_models?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface RepairCostEstimate {
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  estimated_hours: number;
  repair_timeline_days: number;
  parts_breakdown: Array<{
    part: Part;
    quantity: number;
    cost_brl: number;
  }>;
  labor_breakdown: Array<{
    category: string;
    hours: number;
    rate_per_hour: number;
    cost: number;
  }>;
}

// Damage Assessment Types
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';
export type DamageType = 'cosmetic' | 'structural' | 'mechanical' | 'electrical' | 'safety_system' | 'body_panel' | 'interior' | 'glass';

export interface DamageZone {
  zone_id: string;
  zone_name: string;
  affected_components: string[];
  damage_percentage: number;
  repair_priority: number;
  access_difficulty: string;
}

export interface ComponentDamage {
  component_id: string;
  component_name: string;
  part_number?: string;
  damage_type: DamageType;
  severity: DamageSeverity;
  damage_description: string;
  repair_action: string;
  replacement_required: boolean;
  estimated_repair_hours: number;
  estimated_cost: number;
  safety_critical: boolean;
  affects_drivability: boolean;
}

export interface CrashData {
  simulation_id: string;
  crash_type: string;
  impact_speed_kmh: number;
  impact_angle_degrees: number;
  impact_location: { x: number; y: number; z: number; };
  deformation_energy: number;
  crash_timestamp: string;
  environmental_factors: Record<string, any>;
}

export interface DamageAssessment {
  id: string;
  vehicle_vin: string;
  assessment_type: string;
  assessor_name: string;
  assessment_date: string;
  crash_data?: CrashData;
  overall_severity: DamageSeverity;
  total_estimated_cost: number;
  total_estimated_hours: number;
  vehicle_drivable: boolean;
  towing_required: boolean;
  damage_zones: DamageZone[];
  component_damages: ComponentDamage[];
  created_at: string;
  updated_at: string;
}

// Appointment Types
export interface CustomerInfo {
  name: string;
  tax_id?: string;
  phone: string;
  email?: string;
  preferred_contact: 'phone' | 'email' | 'sms' | 'whatsapp';
}

export interface VehicleInfo {
  vin?: string;
  make: string;
  model: string;
  year: number;
  license_plate?: string;
  color?: string;
  engine_type?: string;
  mileage?: number;
}

export interface Appointment {
  id: string;
  booking_id: string;
  confirmation_number: string;
  dealer_cnpj: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  estimated_duration_hours?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  customer_info: CustomerInfo;
  vehicle_info: VehicleInfo;
  status_info: {
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
    status_description: string;
    last_updated: string;
    next_actions: string[];
    can_reschedule: boolean;
    can_cancel: boolean;
  };
  created_at: string;
  updated_at: string;
}

// BeamNG Integration Types
export interface BeamNGConnection {
  connected: boolean;
  host: string;
  port: number;
  version?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  last_heartbeat?: string;
}

export interface BeamNGTelemetry {
  vehicle_id: string;
  timestamp: string;
  position: { x: number; y: number; z: number; };
  velocity: { x: number; y: number; z: number; };
  rotation: { x: number; y: number; z: number; };
  damage_data: Array<{
    component: string;
    damage_level: number;
    deformation: { x: number; y: number; z: number; };
  }>;
  engine_data: {
    rpm: number;
    temperature: number;
    oil_pressure: number;
  };
  wheel_data: Array<{
    wheel_id: string;
    pressure: number;
    temperature: number;
    slip: number;
  }>;
}

// Application State Types
export interface AppState {
  isLoading: boolean;
  currentScreen: 'landing' | 'simulation' | 'analysis' | 'results' | 'appointment';
  beamng: BeamNGConnection;
  selectedVehicle?: Vehicle;
  currentDamageAssessment?: DamageAssessment;
  currentAppointment?: Appointment;
}

// Form Types
export interface VehicleFormData {
  model: string;
  year: number;
  vin: string;
  make: string;
  beamng_model?: string;
}

export interface AppointmentFormData {
  dealer_cnpj: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  customer_info: CustomerInfo;
  vehicle_info: VehicleInfo;
  notes?: string;
}

// Utility Types
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Brazilian Market Specific Types
export interface BrazilianStates {
  'AC': 'Acre';
  'AL': 'Alagoas';
  'AP': 'Amapá';
  'AM': 'Amazonas';
  'BA': 'Bahia';
  'CE': 'Ceará';
  'DF': 'Distrito Federal';
  'ES': 'Espírito Santo';
  'GO': 'Goiás';
  'MA': 'Maranhão';
  'MT': 'Mato Grosso';
  'MS': 'Mato Grosso do Sul';
  'MG': 'Minas Gerais';
  'PA': 'Pará';
  'PB': 'Paraíba';
  'PR': 'Paraná';
  'PE': 'Pernambuco';
  'PI': 'Piauí';
  'RJ': 'Rio de Janeiro';
  'RN': 'Rio Grande do Norte';
  'RS': 'Rio Grande do Sul';
  'RO': 'Rondônia';
  'RR': 'Roraima';
  'SC': 'Santa Catarina';
  'SP': 'São Paulo';
  'SE': 'Sergipe';
  'TO': 'Tocantins';
}

export type BrazilianStateCode = keyof BrazilianStates;