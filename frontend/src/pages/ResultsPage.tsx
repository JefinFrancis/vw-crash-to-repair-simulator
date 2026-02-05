import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Clock,
  DollarSign,
  Car,
  MapPin,
  ArrowRight,
  ArrowLeft,
  FileText,
  Package,
  Shield,
  TrendingUp,
  Loader2,
  RefreshCw,
  List,
  ChevronRight,
  Calendar,
  Gauge
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { beamngService } from '../services/beamngService'
import { vehicleService } from '../services/vehicleService'
import { ComponentDamage, DamageSeverity, DamageAssessment, Vehicle } from '../types'

// Severity color mapping
const severityColors: Record<DamageSeverity, { bg: string; text: string; border: string }> = {
  minor: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  severe: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  total_loss: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

const severityLabels: Record<DamageSeverity, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  total_loss: 'Perda Total',
}

// Format currency in BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format date in Brazilian format
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get severity from damage percentage
const getSeverityFromDamage = (totalDamage: number): DamageSeverity => {
  if (totalDamage >= 0.8) return 'total_loss'
  if (totalDamage >= 0.5) return 'severe'
  if (totalDamage >= 0.2) return 'moderate'
  return 'minor'
}

// Crash item interface for the list
interface CrashItem {
  crash_id: string
  received_at: string
  vehicle: {
    id: number
    name: string
    model: string
    brand: string
  }
  velocity: {
    speed_kmh: number
  }
  damage: {
    total_damage: number
    broken_parts_count: number
    broken_parts: string[]
  }
}

// Transform BeamNG crash data to DamageAssessment format
const transformCrashToAssessment = (crash: any, selectedVehicle?: Vehicle): DamageAssessment => {
  const totalDamage = crash.damage?.total_damage || 0
  const partDamage = crash.damage?.part_damage || {}
  
  const severity = getSeverityFromDamage(totalDamage)
  
  // Transform parts to component damages
  const componentDamages: ComponentDamage[] = Object.entries(partDamage)
    .filter(([_, damage]) => (damage as number) > 0.01)
    .map(([partPath, damage], index) => {
      const partName = partPath.split('/').pop() || partPath
      const damageLevel = damage as number
      
      let partSeverity: DamageSeverity = 'minor'
      if (damageLevel >= 0.8) partSeverity = 'severe'
      else if (damageLevel >= 0.5) partSeverity = 'moderate'
      
      return {
        component_id: `comp_\${index}`,
        component_name: partName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        part_number: partPath,
        damage_type: 'body_panel' as const,
        severity: partSeverity,
        damage_description: `Dano de \${(damageLevel * 100).toFixed(0)}%`,
        repair_action: damageLevel >= 0.8 ? 'Substituir' : 'Reparar',
        replacement_required: damageLevel >= 0.8,
        estimated_repair_hours: damageLevel >= 0.8 ? 2 : 1,
        estimated_cost: damageLevel >= 0.8 ? 500 : 200,
        safety_critical: partPath.includes('suspension') || partPath.includes('brake'),
        affects_drivability: partPath.includes('engine') || partPath.includes('transmission'),
      }
    })
    .sort((a, b) => {
      const aDmg = parseFloat(a.damage_description.match(/\d+/)?.[0] || '0')
      const bDmg = parseFloat(b.damage_description.match(/\d+/)?.[0] || '0')
      return bDmg - aDmg
    })
  
  const totalCost = componentDamages.reduce((sum, c) => sum + c.estimated_cost, 0)
  const totalHours = componentDamages.reduce((sum, c) => sum + c.estimated_repair_hours, 0)
  
  return {
    id: crash.crash_id || 'unknown',
    vehicle_vin: selectedVehicle?.vin || crash.vehicle?.name || 'BeamNG Vehicle',
    assessment_type: 'beamng_crash',
    assessor_name: 'BeamNG Mod',
    assessment_date: crash.received_at || new Date().toISOString(),
    crash_data: {
      simulation_id: crash.crash_id || 'unknown',
      crash_type: 'collision',
      impact_speed_kmh: crash.velocity?.speed_kmh || 0,
      impact_angle_degrees: 0,
      impact_location: crash.position || { x: 0, y: 0, z: 0 },
      deformation_energy: totalDamage * 10000,
      crash_timestamp: crash.received_at || new Date().toISOString(),
      environmental_factors: {},
    },
    overall_severity: severity,
    total_estimated_cost: totalCost,
    total_estimated_hours: totalHours,
    vehicle_drivable: totalDamage < 0.5,
    towing_required: totalDamage >= 0.7,
    damage_zones: [],
    component_damages: componentDamages,
    created_at: crash.received_at || new Date().toISOString(),
    updated_at: crash.received_at || new Date().toISOString(),
  }
}

export function ResultsPage() {
  const navigate = useNavigate()
  const { selectedVehicle, setSelectedVehicle } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [crashes, setCrashes] = useState<CrashItem[]>([])
  const [selectedCrash, setSelectedCrash] = useState<DamageAssessment | null>(null)
  const [vehicleToUse, setVehicleToUse] = useState<Vehicle | undefined>(selectedVehicle)

  // Fetch crash history
  useEffect(() => {
    const fetchCrashHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // If no vehicle selected, fetch the default vehicle (T-Cross)
        let vehicle = selectedVehicle
        if (!vehicle) {
          try {
            const vehicles = await vehicleService.list()
            if (vehicles && vehicles.length > 0) {
              vehicle = vehicles[0]
              setSelectedVehicle(vehicle)
              setVehicleToUse(vehicle)
            }
          } catch (vehicleErr) {
            console.warn('Could not fetch default vehicle:', vehicleErr)
          }
        } else {
          setVehicleToUse(vehicle)
        }
        
        // Get all crash history
        const history = await beamngService.getCrashHistory(50, 0)
        
        if (history.crashes && history.crashes.length > 0) {
          setCrashes(history.crashes)
        } else {
          setError('Nenhuma colisão detectada. Execute uma simulação no BeamNG primeiro.')
        }
      } catch (err) {
        console.error('Failed to fetch crash history:', err)
        setError('Erro ao buscar histórico de colisões.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCrashHistory()
  }, [selectedVehicle, setSelectedVehicle])

  // View crash details
  const viewCrashDetails = async (crash: CrashItem) => {
    try {
      const fullCrash = await beamngService.getCrashById(crash.crash_id)
      const assessment = transformCrashToAssessment(fullCrash, vehicleToUse)
      setSelectedCrash(assessment)
    } catch (err) {
      const assessment = transformCrashToAssessment(crash, vehicleToUse)
      setSelectedCrash(assessment)
    }
  }

  const backToList = () => setSelectedCrash(null)

  const refreshCrashes = async () => {
    setIsLoading(true)
    try {
      const history = await beamngService.getCrashHistory(50, 0)
      if (history.crashes) {
        setCrashes(history.crashes)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-vw-blue mx-auto mb-4" />
          <p className="text-gray-600">Carregando histórico de colisões...</p>
        </div>
      </div>
    )
  }

  if (error && crashes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sem Dados de Colisão</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={refreshCrashes} className="vw-btn-outline flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Tentar Novamente
            </button>
            <button onClick={() => navigate('/simulation')} className="vw-btn-primary">
              Ir para Simulação
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Detail view
  if (selectedCrash) {
    const { overall_severity, total_estimated_cost, total_estimated_hours, vehicle_drivable, towing_required, crash_data, component_damages } = selectedCrash
    const partsToReplace = component_damages?.filter(c => c.replacement_required).length || 0
    const partsToRepair = (component_damages?.length || 0) - partsToReplace
    const safetyCritical = component_damages?.filter(c => c.safety_critical).length || 0
    const laborCost = total_estimated_hours * 150
    const partsCost = total_estimated_cost - laborCost

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className={`py-8 \${overall_severity === 'total_loss' ? 'bg-red-600' : overall_severity === 'severe' ? 'bg-orange-600' : overall_severity === 'moderate' ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>
          <div className="vw-container">
            <button onClick={backToList} className="flex items-center gap-2 text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-5 w-5" /> Voltar para Lista
            </button>
            <h1 className="text-4xl font-bold mb-2">📊 Análise de Danos</h1>
            <p className="opacity-90">{vehicleToUse?.model || 'Veículo'} • {formatDate(selectedCrash.assessment_date)}</p>
          </div>
        </div>

        <div className="vw-container py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg \${severityColors[overall_severity].bg}`}>
                  <AlertTriangle className={`h-5 w-5 \${severityColors[overall_severity].text}`} />
                </div>
                <span className="text-gray-500 text-sm">Severidade</span>
              </div>
              <p className={`text-2xl font-bold \${severityColors[overall_severity].text}`}>{severityLabels[overall_severity]}</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-vw-blue/10"><DollarSign className="h-5 w-5 text-vw-blue" /></div>
                <span className="text-gray-500 text-sm">Custo Estimado</span>
              </div>
              <p className="text-2xl font-bold text-vw-blue">{formatBRL(total_estimated_cost)}</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100"><Clock className="h-5 w-5 text-purple-600" /></div>
                <span className="text-gray-500 text-sm">Tempo Estimado</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{total_estimated_hours}h</p>
            </div>
            <div className="vw-card">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg \${vehicle_drivable ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Car className={`h-5 w-5 \${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <span className="text-gray-500 text-sm">Condição</span>
              </div>
              <p className={`text-lg font-bold \${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`}>{vehicle_drivable ? 'Dirigível' : 'Não Dirigível'}</p>
              {towing_required && <p className="text-sm text-red-500">Guincho necessário</p>}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {crash_data && (
                <div className="vw-card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-vw-blue" /> Dados da Colisão
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Tipo</p><p className="font-semibold capitalize">{crash_data.crash_type}</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Velocidade</p><p className="font-semibold">{crash_data.impact_speed_kmh.toFixed(1)} km/h</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Ângulo</p><p className="font-semibold">{crash_data.impact_angle_degrees}°</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Energia</p><p className="font-semibold">{crash_data.deformation_energy.toFixed(0)} J</p></div>
                  </div>
                </div>
              )}

              <div className="vw-card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-vw-blue" /> Componentes Danificados ({component_damages?.length || 0})
                </h2>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {component_damages?.map((damage: ComponentDamage) => (
                    <div key={damage.component_id} className={`p-4 border rounded-lg \${severityColors[damage.severity].border}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{damage.component_name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full \${severityColors[damage.severity].bg} \${severityColors[damage.severity].text}`}>{severityLabels[damage.severity]}</span>
                            {damage.safety_critical && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1"><Shield className="h-3 w-3" /> Safety</span>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{damage.damage_description}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-500"><Clock className="h-4 w-4" />{damage.estimated_repair_hours}h</span>
                            <span className={`flex items-center gap-1 \${damage.replacement_required ? 'text-orange-600' : 'text-green-600'}`}>
                              {damage.replacement_required ? <><XCircle className="h-4 w-4" />Substituir</> : <><CheckCircle className="h-4 w-4" />Reparar</>}
                            </span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-vw-blue">{formatBRL(damage.estimated_cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="vw-card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-vw-blue" /> Resumo do Orçamento</h2>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Peças ({partsToReplace} subst.)</span><span className="font-medium">{formatBRL(partsCost > 0 ? partsCost : total_estimated_cost * 0.6)}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Mão de obra ({total_estimated_hours}h)</span><span className="font-medium">{formatBRL(laborCost > 0 ? laborCost : total_estimated_cost * 0.4)}</span></div>
                  <div className="flex justify-between py-3 text-lg font-bold"><span>Total</span><span className="text-vw-blue">{formatBRL(total_estimated_cost)}</span></div>
                </div>
              </div>

              <div className="vw-card">
                <h3 className="font-semibold mb-4">Resumo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Substituir</span><span className="font-semibold text-orange-600">{partsToReplace}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Reparar</span><span className="font-semibold text-green-600">{partsToRepair}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Segurança</span><span className="font-semibold text-red-600">{safetyCritical}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => navigate('/dealers')} className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3">
                  <Wrench className="h-6 w-6" /> 🔧 Reparar Meu Carro <ArrowRight className="h-6 w-6" />
                </button>
                <button onClick={() => navigate('/dealers')} className="w-full vw-btn-primary flex items-center justify-center gap-2"><MapPin className="h-5 w-5" /> Ver Concessionárias</button>
                <button onClick={backToList} className="w-full vw-btn-outline">Voltar para Lista</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="py-8 bg-vw-blue text-white">
        <div className="vw-container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3"><List className="h-10 w-10" /> Histórico de Colisões</h1>
              <p className="opacity-90">{vehicleToUse?.model || 'Veículo'} • {crashes.length} colisões registradas</p>
            </div>
            <button onClick={refreshCrashes} className="p-3 bg-white/10 hover:bg-white/20 rounded-lg" title="Atualizar">
              <RefreshCw className={`h-6 w-6 \${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="vw-container py-8">
        <div className="space-y-4">
          <AnimatePresence>
            {crashes.map((crash, index) => {
              const severity = getSeverityFromDamage(crash.damage.total_damage)
              const damagePercent = (crash.damage.total_damage * 100).toFixed(0)
              
              return (
                <motion.div
                  key={crash.crash_id}
                  className="vw-card hover:shadow-lg transition-shadow cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => viewCrashDetails(crash)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-16 rounded-full \${severity === 'total_loss' ? 'bg-red-500' : severity === 'severe' ? 'bg-orange-500' : severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <div className={`p-3 rounded-lg \${severityColors[severity].bg}`}><Car className={`h-8 w-8 \${severityColors[severity].text}`} /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">Colisão #{crashes.length - index}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full \${severityColors[severity].bg} \${severityColors[severity].text}`}>{severityLabels[severity]}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(crash.received_at)}</span>
                        <span className="flex items-center gap-1"><Gauge className="h-4 w-4" />{crash.velocity.speed_kmh.toFixed(0)} km/h</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{damagePercent}% de dano</span>
                        <span className="flex items-center gap-1"><Package className="h-4 w-4" />{crash.damage.broken_parts_count} peças</span>
                      </div>
                      {crash.damage.broken_parts && crash.damage.broken_parts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {crash.damage.broken_parts.slice(0, 4).map((part, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{part}</span>
                          ))}
                          {crash.damage.broken_parts.length > 4 && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">+{crash.damage.broken_parts.length - 4} mais</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-2xl font-bold \${severityColors[severity].text}`}>{damagePercent}%</p>
                        <p className="text-xs text-gray-500">dano total</p>
                      </div>
                      <ChevronRight className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {crashes.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma colisão registrada</h3>
            <p className="text-gray-500 mb-6">Execute uma simulação no BeamNG.drive</p>
            <button onClick={() => navigate('/simulation')} className="vw-btn-primary">Ir para Simulação</button>
          </div>
        )}

        {crashes.length > 0 && (
          <div className="mt-8 flex gap-4 justify-center">
            <button onClick={() => navigate('/simulation')} className="vw-btn-outline">Nova Simulação</button>
            <button onClick={() => navigate('/dealers')} className="vw-btn-primary flex items-center gap-2"><MapPin className="h-5 w-5" /> Ver Concessionárias</button>
          </div>
        )}
      </div>
    </div>
  )
}
