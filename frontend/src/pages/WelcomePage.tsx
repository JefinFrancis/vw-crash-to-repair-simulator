import { useNavigate } from 'react-router-dom'
import { Car, Zap, Activity, Calendar, ArrowRight, Play, FileText, Shield, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'

export function WelcomePage() {
  const navigate = useNavigate()
  
  const handleStartExperience = () => {
    navigate('/home')
  }
  
  const workflowSteps = [
    {
      number: 1,
      icon: Car,
      title: 'Selecionar Veículo',
      description: 'Escolha um veículo VW da frota para iniciar a experiência',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      number: 2,
      icon: Zap,
      title: 'Dirigir no Simulador',
      description: 'Dirija livremente no BeamNG.drive e explore diferentes cenários',
      color: 'text-orange-600 bg-orange-100',
    },
    {
      number: 3,
      icon: FileText,
      title: 'Ver Sinistros',
      description: 'Colisões são detectadas automaticamente e listadas em tempo real',
      color: 'text-purple-600 bg-purple-100',
    },
    {
      number: 4,
      icon: Activity,
      title: 'Analisar Danos',
      description: 'O sistema analisa a telemetria e identifica os componentes danificados',
      color: 'text-red-600 bg-red-100',
    },
    {
      number: 5,
      icon: Calendar,
      title: 'Agendar Reparo',
      description: 'Encontre concessionárias próximas e agende o serviço',
      color: 'text-green-600 bg-green-100',
    },
  ]

  const features = [
    {
      icon: Shield,
      title: 'Simulação Realista',
      description: 'Física avançada do BeamNG.drive para colisões autênticas',
    },
    {
      icon: Wrench,
      title: 'Peças Genuínas',
      description: 'Orçamento com peças originais VW e preços atualizados',
    },
    {
      icon: Activity,
      title: 'Análise em Tempo Real',
      description: 'Telemetria capturada instantaneamente durante a simulação',
    },
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-vw-blue via-vw-blue-dark to-black text-white overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
      </div>
      
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Car className="h-16 w-16" />
              <div className="text-5xl font-bold">×</div>
              <Zap className="h-12 w-12 text-vw-accent" />
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              VW Brand Day
              <span className="block text-3xl lg:text-4xl text-white/80 font-normal mt-2">
                Experiência Colisão-Reparo
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/80 max-w-3xl mx-auto mb-8">
              Experiência completa: da simulação de colisão ao agendamento de reparo
              <br />
              <span className="text-lg text-white/70">Tecnologia BeamNG.drive + Telemetria em Tempo Real + Rede VW</span>
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20"
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-vw-accent rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-vw-blue" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Workflow Steps */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8 text-white">Como Funciona</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.number}
                  className="relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-10 h-full">
                    <div className="flex items-center mb-3">
                      <div className={`w-10 h-10 rounded-lg ${step.color} flex items-center justify-center mr-3`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-3xl font-bold text-white text-opacity-20">{step.number}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-white">{step.title}</h3>
                    <p className="text-sm text-white/70">{step.description}</p>
                  </div>
                  
                  {/* Arrow between steps */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-4 w-4 text-blue-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* CTA Button */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.button
              onClick={handleStartExperience}
              className="group inline-flex items-center px-10 py-5 bg-vw-accent text-vw-blue font-bold text-xl rounded-2xl shadow-2xl hover:shadow-vw-accent/50 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="h-7 w-7 mr-3 group-hover:animate-pulse" />
              Iniciar Experiência
              <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <p className="mt-4 text-blue-300 text-sm">
              Clique para selecionar seu veículo e começar
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div 
            className="mt-16 pt-8 border-t border-white border-opacity-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-blue-300 text-sm">
              VW Brand Day Experience • Simulador de Colisão e Reparo
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
