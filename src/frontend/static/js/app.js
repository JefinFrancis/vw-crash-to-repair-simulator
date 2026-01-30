// VW Crash-to-Repair Simulator - Main Application
class VWSimulatorApp {
  constructor() {
    this.currentScreen = 'welcome';
    this.beamngConnected = false;
    this.simulationData = {};
    this.selectedDealer = null;
    this.apiBaseUrl = 'http://localhost:8001';
    
    this.init();
  }

  init() {
    console.log('🚗 VW Crash-to-Repair Simulator iniciado');
    
    // Bind event listeners
    this.bindEvents();
    
    // Check initial system status
    this.checkSystemStatus();
    
    // Show welcome screen
    this.showScreen('welcome');
    
    // Start connection monitoring
    this.startConnectionMonitoring();
  }

  bindEvents() {
    // System control buttons
    document.getElementById('connectBeamng')?.addEventListener('click', () => this.connectBeamNG());
    document.getElementById('startDemo')?.addEventListener('click', () => this.startDemo());
    
    // Navigation buttons
    document.getElementById('proceedToDamage')?.addEventListener('click', () => this.proceedToDamageAnalysis());
    document.getElementById('proceedToEstimate')?.addEventListener('click', () => this.proceedToEstimate());
    document.getElementById('proceedToDealers')?.addEventListener('click', () => this.proceedToDealers());
    document.getElementById('confirmAppointment')?.addEventListener('click', () => this.confirmAppointment());
    document.getElementById('startNew')?.addEventListener('click', () => this.startNew());
    
    // Dealer selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.dealer-card')) {
        this.selectDealer(e.target.closest('.dealer-card'));
      }
    });
    
    // Filter handlers
    document.getElementById('locationFilter')?.addEventListener('change', () => this.filterDealers());
    document.getElementById('specialtyFilter')?.addEventListener('change', () => this.filterDealers());
    document.getElementById('ratingFilter')?.addEventListener('change', () => this.filterDealers());
  }

  async checkSystemStatus() {
    try {
      // Check API health
      const healthResponse = await fetch(`${this.apiBaseUrl}/api/health`);
      const healthData = await healthResponse.json();
      
      this.updateSystemStatus('api', healthData.status === 'healthy', 
        healthData.status === 'healthy' ? 'API funcionando' : 'API indisponível');
      
      // Check BeamNG connection
      this.beamngConnected = healthData.beamng_connected;
      this.updateSystemStatus('beamng', this.beamngConnected, 
        this.beamngConnected ? 'BeamNG conectado' : 'BeamNG desconectado');
      
      // Check Python environment  
      this.updateSystemStatus('python', healthData.python_ready, 
        healthData.python_ready ? 'Python configurado' : 'Python não configurado');
      
      this.updateConnectionStatus();
      
    } catch (error) {
      console.error('❌ Erro ao verificar status do sistema:', error);
      this.updateSystemStatus('api', false, 'Erro de conexão');
      this.updateSystemStatus('beamng', false, 'Não testado');
      this.updateSystemStatus('python', false, 'Não testado');
      this.updateConnectionStatus();
    }
  }

  updateSystemStatus(component, isHealthy, message) {
    const statusElement = document.querySelector(`[data-status="${component}"]`);
    if (statusElement) {
      const icon = statusElement.querySelector('.status-icon');
      const text = statusElement.querySelector('span');
      
      statusElement.className = `status-item ${isHealthy ? 'success' : 'error'}`;
      icon.textContent = isHealthy ? '✓' : '✗';
      text.textContent = message;
    }
  }

  updateConnectionStatus() {
    const statusElement = document.querySelector('.connection-status');
    const indicator = document.querySelector('.status-indicator');
    const text = document.querySelector('.status-text');
    
    if (this.beamngConnected) {
      statusElement.className = 'connection-status connected';
      indicator.className = 'status-indicator connected';
      text.textContent = 'Conectado';
    } else {
      statusElement.className = 'connection-status disconnected';
      indicator.className = 'status-indicator';
      text.textContent = 'Desconectado';
    }
  }

  startConnectionMonitoring() {
    setInterval(() => {
      this.checkSystemStatus();
    }, 10000); // Check every 10 seconds
  }

  async connectBeamNG() {
    this.showLoading('connectBeamng', 'Conectando...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/health/connect`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.beamngConnected = true;
        this.showNotification('✅ BeamNG conectado com sucesso!', 'success');
        this.updateConnectionStatus();
      } else {
        this.showNotification('❌ Falha na conexão: ' + result.error, 'error');
      }
      
    } catch (error) {
      console.error('❌ Erro na conexão BeamNG:', error);
      this.showNotification('❌ Erro de comunicação com a API', 'error');
    } finally {
      this.hideLoading('connectBeamng');
    }
  }

  async startDemo() {
    if (!this.beamngConnected) {
      this.showNotification('⚠️ Conecte o BeamNG.tech primeiro', 'warning');
      return;
    }
    
    this.showLoading('startDemo', 'Carregando cenário...');
    
    try {
      // Load VW T-Cross scenario
      const response = await fetch(`${this.apiBaseUrl}/api/health/scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle: 'vw_tcross',
          scenario: 'crash_test'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('🚗 Cenário VW T-Cross carregado!', 'success');
        this.showScreen('waiting');
        this.startCrashSimulation();
      } else {
        this.showNotification('❌ Falha ao carregar cenário: ' + result.error, 'error');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar cenário:', error);
      this.showNotification('❌ Erro ao carregar cenário', 'error');
    } finally {
      this.hideLoading('startDemo');
    }
  }

  startCrashSimulation() {
    const progressBar = document.querySelector('.progress-fill');
    const statusText = document.querySelector('#simulationStatus');
    
    let progress = 0;
    const phases = [
      { message: 'Posicionando veículo...', duration: 2000 },
      { message: 'Iniciando simulação de crash...', duration: 3000 },
      { message: 'Coletando dados de telemetria...', duration: 2000 },
      { message: 'Analisando danos...', duration: 2000 },
      { message: 'Processando resultados...', duration: 1000 }
    ];
    
    let currentPhase = 0;
    
    const simulatePhase = () => {
      if (currentPhase >= phases.length) {
        this.finishCrashSimulation();
        return;
      }
      
      const phase = phases[currentPhase];
      statusText.textContent = phase.message;
      
      const phaseProgress = 100 / phases.length;
      const targetProgress = (currentPhase + 1) * phaseProgress;
      
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress >= targetProgress) {
          progress = targetProgress;
          clearInterval(progressInterval);
          currentPhase++;
          setTimeout(simulatePhase, 500);
        }
        progressBar.style.width = `${progress}%`;
      }, 100);
    };
    
    simulatePhase();
  }

  async finishCrashSimulation() {
    try {
      // Get damage analysis
      const response = await fetch(`${this.apiBaseUrl}/api/damage/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: 'vw_tcross_001',
          simulation_id: 'crash_' + Date.now()
        })
      });
      
      const damageData = await response.json();
      this.simulationData.damage = damageData;
      
      this.showNotification('✅ Análise de danos concluída!', 'success');
      this.showScreen('damage');
      this.displayDamageResults(damageData);
      
    } catch (error) {
      console.error('❌ Erro na análise de danos:', error);
      this.showNotification('❌ Erro na análise de danos', 'error');
      
      // Use mock data as fallback
      this.simulationData.damage = this.getMockDamageData();
      this.showScreen('damage');
      this.displayDamageResults(this.simulationData.damage);
    }
  }

  displayDamageResults(damageData) {
    const damageList = document.getElementById('damageList');
    const severityText = document.getElementById('overallSeverity');
    
    // Clear existing content
    damageList.innerHTML = '';
    
    // Add damage items
    damageData.damage_components.forEach(component => {
      const listItem = document.createElement('li');
      listItem.className = 'damage-item';
      
      listItem.innerHTML = `
        <span>${component.name}</span>
        <span class="damage-severity ${component.severity}">
          ${this.getSeverityText(component.severity)}
        </span>
      `;
      
      damageList.appendChild(listItem);
    });
    
    // Update overall severity
    severityText.textContent = this.getSeverityText(damageData.overall_severity);
    severityText.className = `damage-severity ${damageData.overall_severity}`;
  }

  getSeverityText(severity) {
    const severityMap = {
      low: 'Leve',
      medium: 'Moderado', 
      high: 'Severo'
    };
    return severityMap[severity] || severity;
  }

  async proceedToDamageAnalysis() {
    this.showScreen('damage');
  }

  async proceedToEstimate() {
    this.showLoading('proceedToEstimate', 'Calculando orçamento...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/estimates/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: 'vw_tcross_001',
          damage_report: this.simulationData.damage,
          location: 'SP'
        })
      });
      
      const estimateData = await response.json();
      this.simulationData.estimate = estimateData;
      
      this.showScreen('estimate');
      this.displayEstimate(estimateData);
      
    } catch (error) {
      console.error('❌ Erro ao calcular orçamento:', error);
      
      // Use mock data
      this.simulationData.estimate = this.getMockEstimateData();
      this.showScreen('estimate');
      this.displayEstimate(this.simulationData.estimate);
    } finally {
      this.hideLoading('proceedToEstimate');
    }
  }

  displayEstimate(estimateData) {
    // Update summary values
    document.getElementById('totalCost').textContent = this.formatCurrency(estimateData.total_cost);
    document.getElementById('partsTotal').textContent = this.formatCurrency(estimateData.parts_total);
    document.getElementById('laborTotal').textContent = this.formatCurrency(estimateData.labor_total);
    document.getElementById('estimatedDays').textContent = `${estimateData.estimated_days} dias`;
    
    // Update parts table
    const partsTable = document.getElementById('partsTable');
    const tbody = partsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    estimateData.parts.forEach(part => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${part.name}</td>
        <td>${part.part_number}</td>
        <td>${part.quantity}</td>
        <td>${this.formatCurrency(part.unit_price)}</td>
        <td>${this.formatCurrency(part.total_price)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  async proceedToDealers() {
    this.showLoading('proceedToDealers', 'Buscando concessionárias...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/dealers/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: 'São Paulo',
          services: ['crash_repair'],
          parts_availability: this.simulationData.estimate.parts.map(p => p.part_number)
        })
      });
      
      const dealersData = await response.json();
      this.simulationData.dealers = dealersData.dealers;
      
      this.showScreen('dealers');
      this.displayDealers(dealersData.dealers);
      
    } catch (error) {
      console.error('❌ Erro ao buscar concessionárias:', error);
      
      // Use mock data
      this.simulationData.dealers = this.getMockDealersData();
      this.showScreen('dealers');
      this.displayDealers(this.simulationData.dealers);
    } finally {
      this.hideLoading('proceedToDealers');
    }
  }

  displayDealers(dealers) {
    const dealersGrid = document.getElementById('dealersGrid');
    dealersGrid.innerHTML = '';
    
    dealers.forEach(dealer => {
      const dealerCard = document.createElement('div');
      dealerCard.className = 'dealer-card';
      dealerCard.dataset.dealerId = dealer.id;
      
      dealerCard.innerHTML = `
        <div class="dealer-header">
          <div>
            <div class="dealer-name">${dealer.name}</div>
            <div class="dealer-rating">
              ${this.renderStars(dealer.rating)}
              <span>(${dealer.rating.toFixed(1)})</span>
            </div>
          </div>
        </div>
        <div class="dealer-info">
          <p><strong>📍</strong> ${dealer.address}</p>
          <p><strong>📞</strong> ${dealer.phone}</p>
          <p><strong>⏰</strong> ${dealer.hours}</p>
          <p><strong>🔧</strong> ${dealer.specialties.join(', ')}</p>
        </div>
        <div class="dealer-availability">
          <span class="availability-status ${dealer.availability_status.toLowerCase()}">
            ${dealer.availability_text}
          </span>
          <strong>${dealer.distance}km</strong>
        </div>
      `;
      
      dealersGrid.appendChild(dealerCard);
    });
  }

  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHtml = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHtml += '⭐';
    }
    if (hasHalfStar) {
      starsHtml += '⭐'; // Could use half star character
    }
    
    return starsHtml;
  }

  selectDealer(dealerElement) {
    // Remove previous selection
    document.querySelectorAll('.dealer-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Add selection to clicked dealer
    dealerElement.classList.add('selected');
    
    // Store selected dealer
    const dealerId = dealerElement.dataset.dealerId;
    this.selectedDealer = this.simulationData.dealers.find(d => d.id === dealerId);
    
    // Enable appointment button
    const appointmentBtn = document.getElementById('proceedToAppointment');
    if (appointmentBtn) {
      appointmentBtn.disabled = false;
    }
    
    this.showNotification(`📍 ${this.selectedDealer.name} selecionada!`, 'success');
  }

  filterDealers() {
    const locationFilter = document.getElementById('locationFilter').value;
    const specialtyFilter = document.getElementById('specialtyFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    
    document.querySelectorAll('.dealer-card').forEach(card => {
      let show = true;
      
      // Apply filters (implementation would check actual dealer data)
      // This is a simplified version for demo purposes
      
      card.style.display = show ? 'block' : 'none';
    });
  }

  async confirmAppointment() {
    if (!this.selectedDealer) {
      this.showNotification('⚠️ Selecione uma concessionária primeiro', 'warning');
      return;
    }
    
    this.showLoading('confirmAppointment', 'Agendando...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/appointments/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dealer_id: this.selectedDealer.id,
          customer: {
            name: 'Cliente Demo',
            email: 'demo@volkswagen.com.br',
            phone: '(11) 99999-9999'
          },
          service_type: 'crash_repair',
          estimate_id: this.simulationData.estimate.id,
          preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      });
      
      const appointmentData = await response.json();
      this.simulationData.appointment = appointmentData;
      
      this.showScreen('confirmation');
      this.displayConfirmation(appointmentData);
      
    } catch (error) {
      console.error('❌ Erro ao agendar:', error);
      
      // Use mock data
      this.simulationData.appointment = this.getMockAppointmentData();
      this.showScreen('confirmation');
      this.displayConfirmation(this.simulationData.appointment);
    } finally {
      this.hideLoading('confirmAppointment');
    }
  }

  displayConfirmation(appointmentData) {
    document.getElementById('appointmentNumber').textContent = appointmentData.id;
    document.getElementById('appointmentDate').textContent = this.formatDate(appointmentData.date);
    document.getElementById('appointmentTime').textContent = appointmentData.time;
    document.getElementById('appointmentDealer').textContent = this.selectedDealer.name;
    document.getElementById('appointmentAddress').textContent = this.selectedDealer.address;
    document.getElementById('appointmentPhone').textContent = this.selectedDealer.phone;
    document.getElementById('appointmentTotal').textContent = this.formatCurrency(this.simulationData.estimate.total_cost);
  }

  startNew() {
    // Reset simulation data
    this.simulationData = {};
    this.selectedDealer = null;
    
    // Reset UI
    document.querySelectorAll('.progress-fill').forEach(bar => {
      bar.style.width = '0%';
    });
    
    // Go back to welcome screen
    this.showScreen('welcome');
    
    this.showNotification('🔄 Nova simulação iniciada', 'info');
  }

  showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}Screen`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenName;
    }
    
    console.log(`📺 Tela ativa: ${screenName}`);
  }

  showLoading(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="loading-spinner"></span> ${text}`;
    }
  }

  hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = false;
      // Reset button text based on ID
      const buttonTexts = {
        'connectBeamng': 'Conectar BeamNG.tech',
        'startDemo': 'Iniciar Demonstração',
        'proceedToEstimate': 'Ver Orçamento',
        'proceedToDealers': 'Buscar Concessionárias',
        'confirmAppointment': 'Confirmar Agendamento'
      };
      button.textContent = buttonTexts[buttonId] || 'Continuar';
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  formatDate(dateString) {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  }

  // Mock data for fallback scenarios
  getMockDamageData() {
    return {
      vehicle_id: 'vw_tcross_001',
      overall_severity: 'medium',
      damage_components: [
        { name: 'Para-choque Dianteiro', severity: 'high', damage_type: 'impact' },
        { name: 'Farol Esquerdo', severity: 'medium', damage_type: 'broken' },
        { name: 'Grade Frontal', severity: 'medium', damage_type: 'deformed' },
        { name: 'Capô', severity: 'low', damage_type: 'scratched' }
      ],
      analysis_timestamp: new Date().toISOString()
    };
  }

  getMockEstimateData() {
    return {
      id: 'EST_' + Date.now(),
      total_cost: 4850.00,
      parts_total: 3200.00,
      labor_total: 1650.00,
      estimated_days: 3,
      parts: [
        {
          name: 'Para-choque Dianteiro T-Cross',
          part_number: 'VW-2GA807221',
          quantity: 1,
          unit_price: 1200.00,
          total_price: 1200.00
        },
        {
          name: 'Farol LED Esquerdo',
          part_number: 'VW-2GA941005B',
          quantity: 1,
          unit_price: 850.00,
          total_price: 850.00
        },
        {
          name: 'Grade Frontal com Emblema',
          part_number: 'VW-2GA853651',
          quantity: 1,
          unit_price: 650.00,
          total_price: 650.00
        },
        {
          name: 'Tinta e Verniz',
          part_number: 'VW-PAINT001',
          quantity: 1,
          unit_price: 500.00,
          total_price: 500.00
        }
      ]
    };
  }

  getMockDealersData() {
    return [
      {
        id: 'vw_sp_001',
        name: 'VW Ibirapuera',
        address: 'Av. Ibirapuera, 2332 - Ibirapuera, São Paulo - SP',
        phone: '(11) 3045-1234',
        hours: 'Seg-Sex: 8h-18h, Sáb: 8h-16h',
        specialties: ['Reparo de Colisão', 'Pintura', 'Peças Originais'],
        rating: 4.5,
        distance: 8.5,
        availability_status: 'Available',
        availability_text: 'Disponível amanhã'
      },
      {
        id: 'vw_sp_002', 
        name: 'VW Vila Madalena',
        address: 'R. Harmonia, 1234 - Vila Madalena, São Paulo - SP',
        phone: '(11) 3028-5678',
        hours: 'Seg-Sex: 8h-18h, Sáb: 8h-14h',
        specialties: ['Reparo Geral', 'Funilaria', 'Elétrica'],
        rating: 4.2,
        distance: 12.3,
        availability_status: 'Busy',
        availability_text: 'Próximo slot: 3 dias'
      },
      {
        id: 'vw_sp_003',
        name: 'VW Mooca',
        address: 'Av. Paes de Barros, 567 - Mooca, São Paulo - SP', 
        phone: '(11) 2095-9876',
        hours: 'Seg-Sex: 7h-18h, Sáb: 8h-16h',
        specialties: ['Centro de Colisão', 'Chassi', 'Suspensão'],
        rating: 4.8,
        distance: 15.7,
        availability_status: 'Available', 
        availability_text: 'Disponível hoje'
      }
    ];
  }

  getMockAppointmentData() {
    return {
      id: 'APT_' + Date.now(),
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '09:00',
      status: 'confirmed'
    };
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando VW Crash-to-Repair Simulator...');
  window.vwApp = new VWSimulatorApp();
});