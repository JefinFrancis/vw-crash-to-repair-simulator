import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Car,
  Zap,
  Shield,
  Wrench,
  ArrowRight,
  BarChart3,
  Target,
  Cpu
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

// Severity colors
const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  minor: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  severe: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  total_loss: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

const damageTypeIcons: Record<string, typeof Wrench> = {
  structural: Shield,
  body_panel: Car,
  mechanical: Wrench,
  electrical: Zap,
  glass: Target,
}

export function AnalysisPage() {
  const navigate = useNavigate()
  const { currentDamageAssessment, selectedVehicle } = useAppStore()
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState('initializing')
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  // Simulate analysis progress
  useEffect(() => {
    if (!currentDamageAssessment) {
      // Simulate analysis if no data
      const stages = [
        { progress: 20, stage: 'scanning' },
        { progress: 40, stage: 'detecting' },
        { progress: 60, stage: 'classifying' },
        { progress: 80, stage: 'calculating' },
        { progress: 100, stage: 'complete' },
      ]

      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex < stages.length) {
          setAnalysisProgress(stages[currentIndex].progress)
          setAnalysisStage(stages[currentIndex].stage)
          currentIndex++
        } else {
          setIsAnalyzing(false)
          clearInterval(interval)
        }
      }, 800)

      return () => clearInterval(interval)
    } else {
      // If we have data, show it immediately
      setAnalysisProgress(100)
      setAnalysisStage('complete')
      setIsAnalyzing(false)
    }
  }, [currentDamageAssessment])

  const stageLabels: Record<string, string> = {
    initializing: 'Initializing AI Analysis Engine...',
    scanning: 'Scanning vehicle structure...',
    detecting: 'Detecting damage patterns...',
    classifying: 'Classifying component damage...',
    calculating: 'Calculating repair estimates...',
    complete: 'Analysis Complete',
  }

  const handleProceedToResults = () => {
    navigate('/results')
  }

  // Mock analysis data if no real data
  const analysisData = currentDamageAssessment || {
    overall_severity: 'moderate',
    component_damages: [
      { component_name: 'Front Bumper', severity: 'severe', damage_type: 'body_panel' },
      { component_name: 'Hood', severity: 'moderate', damage_type: 'body_panel' },
      { component_name: 'Left Headlight', severity: 'severe', damage_type: 'electrical' },
      { component_name: 'Left Fender', severity: 'moderate', damage_type: 'body_panel' },
    ],
    total_estimated_cost: 6050,
    total_estimated_hours: 13,
  }

  const componentDamages = analysisData.component_damages || []
  const severeCounts = componentDamages.filter(d => d.severity === 'severe').length
  const moderateCounts = componentDamages.filter(d => d.severity === 'moderate').length
  const minorCounts = componentDamages.filter(d => d.severity === 'minor').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="bg-black/30 py-6">
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-vw-blue" />
              AI Damage Analysis
            </h1>
            <p className="text-gray-400 mt-2">
              Advanced computer vision analysis of crash damage
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis View */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Info */}
            {selectedVehicle && (
              <motion.div
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-vw-blue rounded-xl flex items-center justify-center">
                    <Car className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">VW {selectedVehicle.model}</h2>
                    <p className="text-gray-400">Year: {selectedVehicle.year} • VIN: {selectedVehicle.vin}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analysis Progress */}
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="h-6 w-6 text-vw-blue" />
                <h3 className="text-xl font-semibold">Analysis Progress</h3>
              </div>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-vw-blue to-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="absolute right-0 top-4 text-sm text-gray-400">
                    {analysisProgress}%
                  </span>
                </div>

                {/* Stage Indicator */}
                <div className="flex items-center gap-2">
                  {isAnalyzing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-vw-blue border-t-transparent" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  <span className={isAnalyzing ? 'text-vw-blue' : 'text-green-400'}>
                    {stageLabels[analysisStage]}
                  </span>
                </div>

                {/* Stage Steps */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {['scanning', 'detecting', 'classifying', 'calculating', 'complete'].map((stage, index) => {
                    const isActive = analysisStage === stage
                    const isComplete = ['complete'].includes(analysisStage) || 
                      (index < ['scanning', 'detecting', 'classifying', 'calculating', 'complete'].indexOf(analysisStage))
                    
                    return (
                      <div
                        key={stage}
                        className={`text-center p-2 rounded-lg transition-all ${
                          isActive ? 'bg-vw-blue text-white' :
                          isComplete ? 'bg-green-500/20 text-green-400' :
                          'bg-white/5 text-gray-500'
                        }`}
                      >
                        <div className="text-xs font-medium capitalize">{stage}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* Damage Visualization */}
            {!isAnalyzing && (
              <motion.div
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-6 w-6 text-vw-blue" />
                  <h3 className="text-xl font-semibold">Damage Breakdown</h3>
                </div>

                <div className="space-y-4">
                  {componentDamages.map((damage, index) => {
                    const DamageIcon = damageTypeIcons[damage.damage_type] || Wrench
                    const colors = severityColors[damage.severity] || severityColors.moderate
                    
                    return (
                      <motion.div
                        key={index}
                        className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <DamageIcon className={`h-5 w-5 ${colors.text}`} />
                            <span className={`font-semibold ${colors.text}`}>
                              {damage.component_name}
                            </span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {damage.severity.charAt(0).toUpperCase() + damage.severity.slice(1)}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            {/* Overall Severity */}
            <motion.div
              className={`rounded-xl p-6 border ${
                severityColors[analysisData.overall_severity]?.bg || 'bg-gray-800'
              } ${severityColors[analysisData.overall_severity]?.border || 'border-gray-700'}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className={`h-6 w-6 ${
                  severityColors[analysisData.overall_severity]?.text || 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  severityColors[analysisData.overall_severity]?.text || 'text-gray-400'
                }`}>
                  Overall Severity
                </h3>
              </div>
              <p className={`text-3xl font-bold capitalize ${
                severityColors[analysisData.overall_severity]?.text || 'text-gray-400'
              }`}>
                {analysisData.overall_severity}
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold mb-4">Damage Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Components</span>
                  <span className="text-2xl font-bold">{componentDamages.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400">Severe</span>
                  <span className="text-xl font-bold text-red-400">{severeCounts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-400">Moderate</span>
                  <span className="text-xl font-bold text-yellow-400">{moderateCounts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Minor</span>
                  <span className="text-xl font-bold text-green-400">{minorCounts}</span>
                </div>
              </div>
            </motion.div>

            {/* Estimated Cost */}
            <motion.div
              className="bg-vw-blue rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-2">Estimated Repair Cost</h3>
              <p className="text-4xl font-bold">
                ${analysisData.total_estimated_cost?.toLocaleString() || '0'}
              </p>
              <p className="text-blue-200 mt-2">
                Estimated time: {analysisData.total_estimated_hours || 0} hours
              </p>
            </motion.div>

            {/* Action Button */}
            {!isAnalyzing && (
              <motion.button
                onClick={handleProceedToResults}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Full Results
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}