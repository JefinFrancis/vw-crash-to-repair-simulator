// VW Crash-to-Repair Simulator - API Utilities

class VWApiClient {
  constructor(baseUrl = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 seconds
  }

  // Generic API request method with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      console.log(`✅ API Response: ${endpoint}`, data);
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or other errors
      console.error(`❌ API Error: ${endpoint}`, error);
      throw new APIError(
        'Network error or server unavailable',
        0,
        { original: error.message }
      );
    }
  }

  // GET request helper
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request helper
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request helper
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request helper
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Health check methods
  async checkHealth() {
    return this.get('/api/health');
  }

  async connectBeamNG() {
    return this.post('/api/health/connect', {});
  }

  async loadScenario(vehicleType, scenarioName) {
    return this.post('/api/health/scenario', {
      vehicle: vehicleType,
      scenario: scenarioName
    });
  }

  // Damage analysis methods
  async analyzeDamage(vehicleId, simulationId) {
    return this.post('/api/damage/analyze', {
      vehicle_id: vehicleId,
      simulation_id: simulationId
    });
  }

  async startDamageWorkflow(vehicleId) {
    return this.post('/api/damage/workflow', {
      vehicle_id: vehicleId
    });
  }

  async getMockDamage() {
    return this.get('/api/damage/mock');
  }

  // Estimate methods
  async calculateEstimate(vehicleId, damageReport, location = 'SP') {
    return this.post('/api/estimates/calculate', {
      vehicle_id: vehicleId,
      damage_report: damageReport,
      location: location
    });
  }

  async getEstimateById(estimateId) {
    return this.get(`/api/estimates/${estimateId}`);
  }

  // Dealer methods
  async searchDealers(filters = {}) {
    return this.post('/api/dealers/search', filters);
  }

  async getDealerById(dealerId) {
    return this.get(`/api/dealers/${dealerId}`);
  }

  async checkInventory(dealerId, partNumbers) {
    return this.post(`/api/dealers/${dealerId}/inventory`, {
      part_numbers: partNumbers
    });
  }

  // Appointment methods
  async scheduleAppointment(appointmentData) {
    return this.post('/api/appointments/schedule', appointmentData);
  }

  async getAppointment(appointmentId) {
    return this.get(`/api/appointments/${appointmentId}`);
  }

  async updateAppointmentStatus(appointmentId, status) {
    return this.put(`/api/appointments/${appointmentId}/status`, {
      status: status
    });
  }
}

// Custom error class for API errors
class APIError extends Error {
  constructor(message, statusCode = 0, details = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }

  // Check if error is a specific HTTP status
  isStatus(code) {
    return this.statusCode === code;
  }

  // Check if error is a client error (4xx)
  isClientError() {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  // Check if error is a server error (5xx)
  isServerError() {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  // Check if error is a network error
  isNetworkError() {
    return this.statusCode === 0;
  }
}

// Utility functions for data formatting and validation
class VWUtils {
  
  // Format currency in Brazilian Real
  static formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  // Format date in Brazilian format
  static formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('pt-BR', { ...defaultOptions, ...options })
      .format(new Date(date));
  }

  // Format time in Brazilian format
  static formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Format phone number
  static formatPhone(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XX) 9XXXX-XXXX for mobile or (XX) XXXX-XXXX for landline
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    
    return phone; // Return original if can't format
  }

  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generate unique ID
  static generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  // Debounce function for search inputs
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Calculate distance between two points (simplified)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Sanitize HTML to prevent XSS
  static sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Local storage helpers
  static saveToStorage(key, data) {
    try {
      localStorage.setItem(`vw_simulator_${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  }

  static loadFromStorage(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(`vw_simulator_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  }

  static removeFromStorage(key) {
    try {
      localStorage.removeItem(`vw_simulator_${key}`);
      return true;
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
      return false;
    }
  }

  // Performance monitoring
  static measurePerformance(label, func) {
    return async function(...args) {
      const start = performance.now();
      try {
        const result = await func(...args);
        const end = performance.now();
        console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        console.error(`❌ ${label} failed after ${(end - start).toFixed(2)}ms:`, error);
        throw error;
      }
    };
  }

  // Retry mechanism for failed operations
  static async retry(func, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await func();
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
}

// Brazilian specific utilities
class BrazilianUtils {
  
  // Validate CPF (Brazilian individual taxpayer registry)
  static isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return (
      digit1 === parseInt(cpf.charAt(9)) &&
      digit2 === parseInt(cpf.charAt(10))
    );
  }

  // Format CPF
  static formatCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  // Validate CNPJ (Brazilian company registry)
  static isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    
    if (cnpj.length !== 14) return false;
    
    // Validation algorithm for CNPJ
    let sum = 0;
    let weight = 2;
    
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    sum = 0;
    weight = 2;
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return (
      digit1 === parseInt(cnpj.charAt(12)) &&
      digit2 === parseInt(cnpj.charAt(13))
    );
  }

  // Format CNPJ
  static formatCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // Brazilian states
  static getStates() {
    return [
      { code: 'AC', name: 'Acre' },
      { code: 'AL', name: 'Alagoas' },
      { code: 'AP', name: 'Amapá' },
      { code: 'AM', name: 'Amazonas' },
      { code: 'BA', name: 'Bahia' },
      { code: 'CE', name: 'Ceará' },
      { code: 'DF', name: 'Distrito Federal' },
      { code: 'ES', name: 'Espírito Santo' },
      { code: 'GO', name: 'Goiás' },
      { code: 'MA', name: 'Maranhão' },
      { code: 'MT', name: 'Mato Grosso' },
      { code: 'MS', name: 'Mato Grosso do Sul' },
      { code: 'MG', name: 'Minas Gerais' },
      { code: 'PA', name: 'Pará' },
      { code: 'PB', name: 'Paraíba' },
      { code: 'PR', name: 'Paraná' },
      { code: 'PE', name: 'Pernambuco' },
      { code: 'PI', name: 'Piauí' },
      { code: 'RJ', name: 'Rio de Janeiro' },
      { code: 'RN', name: 'Rio Grande do Norte' },
      { code: 'RS', name: 'Rio Grande do Sul' },
      { code: 'RO', name: 'Rondônia' },
      { code: 'RR', name: 'Roraima' },
      { code: 'SC', name: 'Santa Catarina' },
      { code: 'SP', name: 'São Paulo' },
      { code: 'SE', name: 'Sergipe' },
      { code: 'TO', name: 'Tocantins' }
    ];
  }
}

// Export classes for use in main app
window.VWApiClient = VWApiClient;
window.VWUtils = VWUtils;
window.BrazilianUtils = BrazilianUtils;
window.APIError = APIError;