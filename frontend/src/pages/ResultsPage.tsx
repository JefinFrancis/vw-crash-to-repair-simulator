import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  FileText,
  Package,
  Shield,
  TrendingUp
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ComponentDamage, DamageSeverity } from '../types'

// Severity color mapping
const severityColors: Record<DamageSeverity, { bg: string; text: string; border: string }> = {
  minor: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  severe: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  total_loss: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

const severityLabels: Record<DamageSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
  total_loss: 'Total Loss',
}

// Format currency in USD
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function ResultsPage() {
  const navigate = useNavigate()
  const { currentDamageAssessment, selectedVehicle } = useAppStore()

  // Redirect if no assessment data
  useEffect(() => {
    if (!currentDamageAssessment) {
      navigate('/simulation')
    }
  }, [currentDamageAssessment, navigate])

  if (!currentDamageAssessment) {
    return null
  }

  const {
    overall_severity,
    total_estimated_cost,
    total_estimated_hours,
    vehicle_drivable,
    towing_required,
    crash_data,
    damage_zones,
    component_damages,
  } = currentDamageAssessment

  // Calculate stats
  const partsToReplace = component_damages?.filter(c => c.replacement_required).length || 0
  const partsToRepair = (component_damages?.length || 0) - partsToReplace
  const safetyCritical = component_damages?.filter(c => c.safety_critical).length || 0
  const laborCost = total_estimated_hours * 150 // R$150/hour labor rate
  const partsCost = total_estimated_cost - laborCost

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className={`py-8 ${
        overall_severity === 'total_loss' ? 'bg-red-600' :
        overall_severity === 'severe' ? 'bg-orange-600' :
        overall_severity === 'moderate' ? 'bg-yellow-600' :
        'bg-green-600'
      } text-white`}>
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">📊 Damage Analysis</h1>
            <p className="opacity-90">
              Complete report of the simulated accident
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            className="vw-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${severityColors[overall_severity].bg}`}>
                <AlertTriangle className={`h-5 w-5 ${severityColors[overall_severity].text}`} />
              </div>
              <span className="text-gray-500 text-sm">Severidade</span>
            </div>
            <p className={`text-2xl font-bold ${severityColors[overall_severity].text}`}>
              {severityLabels[overall_severity]}
            </p>
          </motion.div>

          <motion.div
            className="vw-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-vw-blue/10">
                <DollarSign className="h-5 w-5 text-vw-blue" />
              </div>
              <span className="text-gray-500 text-sm">Estimated Cost</span>
            </div>
            <p className="text-2xl font-bold text-vw-blue">
              {formatBRL(total_estimated_cost)}
            </p>
          </motion.div>

          <motion.div
            className="vw-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-gray-500 text-sm">Estimated Time</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {total_estimated_hours}h
            </p>
            <p className="text-sm text-gray-500">
              ~{Math.ceil(total_estimated_hours / 8)} business days
            </p>
          </motion.div>

          <motion.div
            className="vw-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${vehicle_drivable ? 'bg-green-100' : 'bg-red-100'}`}>
                <Car className={`h-5 w-5 ${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <span className="text-gray-500 text-sm">Condition</span>
            </div>
            <p className={`text-lg font-bold ${vehicle_drivable ? 'text-green-600' : 'text-red-600'}`}>
              {vehicle_drivable ? 'Drivable' : 'Not Drivable'}
            </p>
            {towing_required && (
              <p className="text-sm text-red-500">Tow truck required</p>
            )}
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Damage Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Crash Data */}
            {crash_data && (
              <motion.div
                className="vw-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-vw-blue" />
                  Collision Data
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-semibold capitalize">{crash_data.crash_type}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Velocity</p>
                    <p className="font-semibold">{crash_data.impact_speed_kmh} km/h</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Angle</p>
                    <p className="font-semibold">{crash_data.impact_angle_degrees}°</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Energia</p>
                    <p className="font-semibold">{crash_data.deformation_energy.toFixed(0)} J</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Component Damages */}
            <motion.div
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-vw-blue" />
                Componentes Danificados ({component_damages?.length || 0})
              </h2>
              
              <div className="space-y-4">
                {component_damages?.map((damage: ComponentDamage, index: number) => (
                  <motion.div
                    key={damage.component_id}
                    className={`p-4 border rounded-lg ${severityColors[damage.severity].border}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{damage.component_name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[damage.severity].bg} ${severityColors[damage.severity].text}`}>
                            {severityLabels[damage.severity]}
                          </span>
                          {damage.safety_critical && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Safety
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {damage.damage_description}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Package className="h-4 w-4" />
                            {damage.part_number || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-4 w-4" />
                            {damage.estimated_repair_hours}h
                          </span>
                          <span className={`flex items-center gap-1 ${
                            damage.replacement_required ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {damage.replacement_required ? (
                              <>
                                <XCircle className="h-4 w-4" />
                                Replace
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Repair
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-vw-blue">
                          {formatBRL(damage.estimated_cost)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <motion.div
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-vw-blue" />
                Budget Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Parts ({partsToReplace} replacements)</span>
                  <span className="font-medium">{formatBRL(partsCost > 0 ? partsCost : total_estimated_cost * 0.6)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Labor ({total_estimated_hours}h)</span>
                  <span className="font-medium">{formatBRL(laborCost > 0 ? laborCost : total_estimated_cost * 0.4)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold">
                  <span>Total Estimated</span>
                  <span className="text-vw-blue">{formatBRL(total_estimated_cost)}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Estimated values. The final quote may vary according to in-person evaluation.
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="vw-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className="font-semibold mb-4">Repair Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Parts to replace</span>
                  <span className="font-semibold text-orange-600">{partsToReplace}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Parts to repair</span>
                  <span className="font-semibold text-green-600">{partsToRepair}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Safety items</span>
                  <span className="font-semibold text-red-600">{safetyCritical}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Affected zones</span>
                  <span className="font-semibold">{damage_zones?.length || 1}</span>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {/* REPAIR MY CAR - Primary CTA */}
              <button
                onClick={() => navigate('/dealers')}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Wrench className="h-6 w-6" />
                🔧 Repair My Car
                <ArrowRight className="h-6 w-6" />
              </button>
              
              <p className="text-center text-sm text-gray-500">
                Find a VW dealership and schedule the repair
              </p>
              
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => navigate('/dealers')}
                  className="w-full vw-btn-primary flex items-center justify-center gap-2"
                >
                  <MapPin className="h-5 w-5" />
                  View Dealer Network
                </button>
              </div>
              
              <button
                onClick={() => navigate('/simulation')}
                className="w-full vw-btn-outline"
              >
                New Simulation
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}