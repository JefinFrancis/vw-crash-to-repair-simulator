import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Zap, Activity, Calendar, ArrowRight, Play, FileText } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { VehicleSelector } from '../components/VehicleSelector'
import { motion } from 'framer-motion'

export function LandingPage() {
  const navigate = useNavigate()
  const { setCurrentScreen, selectedVehicle, setSelectedVehicle } = useAppStore()
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  
  const handleStartExperience = () => {
    if (!selectedVehicle) {
      setShowVehicleSelector(true)
      return
    }
    
    setCurrentScreen('simulation')
    navigate('/simulation')
  }
  
  const workflowSteps = [
    {
      number: 1,
      icon: Zap,
      title: 'Simular Colisão',
      description: 'Dirija um veículo VW no BeamNG.drive e execute diferentes cenários de colisão',
      color: 'text-orange-600 bg-orange-100',
    },
    {
      number: 2,
      icon: Activity,
      title: 'Analisar Danos',
      description: 'O sistema analisa a telemetria em tempo real e identifica os componentes danificados',
      color: 'text-red-600 bg-red-100',
    },
    {
      number: 3,
      icon: FileText,
      title: 'Calcular Custos',
      description: 'Orçamento automático de reparo com preços e peças genuínas VW',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      number: 4,
      icon: Calendar,
      title: 'Agendar Reparo',
      description: 'Encontre concessionárias próximas e agende o serviço automaticamente',
      color: 'text-green-600 bg-green-100',
    },
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-vw-blue via-vw-blue-dark to-black text-white overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
      </div>
      
      <div className="relative z-10">
        <div className="vw-container py-16">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Car className="h-16 w-16" />
              <div className="text-6xl font-bold">×</div>
              <Zap className="h-12 w-12 text-vw-accent" />
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              VW Brand Day
              <span className="block text-3xl lg:text-4xl text-blue-300 font-normal mt-2">
                Experiência Colisão-Reparo
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-blue-200 max-w-3xl mx-auto mb-8">
              Experiência completa: da simulação de colisão ao orçamento de reparo
              <br />
              <span className="text-lg">Tecnologia BeamNG.drive + IA + Rede de Concessionárias VW</span>
            </p>
            
            {/* Vehicle Selection */}
            {selectedVehicle ? (
              <motion.div 
                className="inline-flex items-center bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 mb-8"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Car className="h-8 w-8 mr-4" />
                <div className="text-left">
                  <div className="font-semibold text-lg">{selectedVehicle.model}</div>
                  <div className="text-blue-200">Ano: {selectedVehicle.year} • VIN: {selectedVehicle.vin.slice(-6)}</div>
                </div>
                <button 
                  onClick={() => setShowVehicleSelector(true)}
                  className="ml-6 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                >
                  Alterar
                </button>
              </motion.div>
            ) : (
              <motion.div 
                className="inline-flex items-center bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 mb-8"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Car className="h-8 w-8 mr-4" />
                <span className="text-lg">Nenhum veículo selecionado</span>
              </motion.div>
            )}
            
            {/* Start Button */}
            <motion.button
              onClick={handleStartExperience}
              className="inline-flex items-center px-8 py-4 bg-vw-accent hover:bg-orange-600 rounded-2xl text-xl font-semibold transition-all transform hover:scale-105 shadow-2xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="h-6 w-6 mr-3" />
              Iniciar Experiência
              <ArrowRight className="h-6 w-6 ml-3" />
            </motion.button>
          </motion.div>
          
          {/* Workflow Steps */}
          <motion.div 
            className="grid lg:grid-cols-4 gap-8 mb-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-opacity-20 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  whileHover={{ y: -5 }}
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${step.color} mb-4`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-blue-200 leading-relaxed">{step.description}</p>
                  
                  <div className="mt-4 text-3xl font-bold text-white bg-opacity-20 bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    {step.number}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
          
          {/* Features Grid */}
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-3">🌐 Mercado Global</h3>
              <p className="text-blue-200">
                Preços internacionais, validação de concessionárias e integração com rede VW
              </p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-3">⚡ Tempo Real</h3>
              <p className="text-blue-200">
                Telemetria BeamNG.drive em tempo real com análise instantânea de danos
              </p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-3">🚗 VW Oficial</h3>
              <p className="text-blue-200">
                Catálogo oficial de peças VW, preços reais e integração com concessionárias
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Vehicle Selector Modal */}
      {showVehicleSelector && (
        <VehicleSelector
          onSelect={(vehicle) => {
            setSelectedVehicle(vehicle)
            setShowVehicleSelector(false)
          }}
          onClose={() => setShowVehicleSelector(false)}
        />
      )}
    </div>
  )
}