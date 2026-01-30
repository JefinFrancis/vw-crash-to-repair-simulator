import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  Search,
  Eye,
  Download,
  Calendar,
  Car,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  Filter
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import toast from 'react-hot-toast'

// Format currency in USD
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// Format date
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date))
}

const severityColors: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  total_loss: 'bg-red-100 text-red-800',
}

const severityLabels: Record<string, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
  total_loss: 'Total Loss',
}

export function DamageReportsPage() {
  const navigate = useNavigate()
  const { currentDamageAssessment, selectedVehicle } = useAppStore()
  const [search, setSearch] = useState('')

  // Mock historical reports (in real app, this would come from API)
  const mockReports = currentDamageAssessment ? [
    {
      id: currentDamageAssessment.id,
      vehicle: selectedVehicle,
      assessment: currentDamageAssessment,
      created_at: currentDamageAssessment.created_at,
      status: 'completed'
    }
  ] : []

  // Demo reports for display
  const demoReports = [
    {
      id: 'demo-1',
      vehicle: { model: 'T-Cross', year: 2024, vin: 'WVWZZZTCROSSA0000' },
      overall_severity: 'moderate',
      total_cost: 4850,
      components_affected: 4,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'completed'
    },
    {
      id: 'demo-2',
      vehicle: { model: 'Golf', year: 2024, vin: 'WVWZZZGOLFA000001' },
      overall_severity: 'minor',
      total_cost: 1200,
      components_affected: 2,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      status: 'completed'
    },
    {
      id: 'demo-3',
      vehicle: { model: 'Polo', year: 2023, vin: 'WVWZZZPOLOB000002' },
      overall_severity: 'severe',
      total_cost: 12500,
      components_affected: 8,
      created_at: new Date(Date.now() - 259200000).toISOString(),
      status: 'pending_review'
    },
  ]

  const allReports = [...mockReports.map(r => ({
    id: r.id,
    vehicle: r.vehicle,
    overall_severity: r.assessment.overall_severity,
    total_cost: r.assessment.total_estimated_cost,
    components_affected: r.assessment.component_damages?.length || 0,
    created_at: r.created_at,
    status: r.status
  })), ...demoReports]

  const filteredReports = allReports.filter(report =>
    report.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
    report.vehicle?.vin?.toLowerCase().includes(search.toLowerCase())
  )

  const handleViewReport = (reportId: string) => {
    if (reportId === currentDamageAssessment?.id) {
      navigate('/results')
    } else {
      toast.success('Opening report details...')
    }
  }

  const handleNewSimulation = () => {
    navigate('/simulation')
  }

  // Stats
  const totalReports = allReports.length
  const completedReports = allReports.filter(r => r.status === 'completed').length
  const totalDamageValue = allReports.reduce((sum, r) => sum + r.total_cost, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-vw-blue text-white py-6">
        <div className="vw-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Damage Reports
            </h1>
            <p className="text-blue-200 mt-2">
              View and manage crash damage assessment reports
            </p>
          </motion.div>
        </div>
      </div>

      <div className="vw-container py-8">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedReports}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalReports - completedReports}</p>
                <p className="text-sm text-gray-500">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDamageValue)}</p>
                <p className="text-sm text-gray-500">Total Damage Value</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions Bar */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vehicle model or VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vw-blue focus:border-transparent"
            />
          </div>

          {/* New Simulation Button */}
          <button
            onClick={handleNewSimulation}
            className="vw-btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Simulation
          </button>
        </motion.div>

        {/* Reports List */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
              <div className="col-span-3">Vehicle</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-2">Components</div>
              <div className="col-span-2">Estimated Cost</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredReports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No damage reports found</p>
                <button
                  onClick={handleNewSimulation}
                  className="vw-btn-primary"
                >
                  Start New Simulation
                </button>
              </div>
            ) : (
              filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Vehicle */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-vw-blue rounded-lg flex items-center justify-center">
                        <Car className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 block">
                          VW {report.vehicle?.model || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {report.vehicle?.vin?.slice(-8) || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Severity */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[report.overall_severity]}`}>
                        {report.overall_severity === 'severe' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {severityLabels[report.overall_severity] || report.overall_severity}
                      </span>
                    </div>

                    {/* Components */}
                    <div className="col-span-2 text-gray-600">
                      {report.components_affected} component{report.components_affected !== 1 ? 's' : ''}
                    </div>

                    {/* Cost */}
                    <div className="col-span-2 font-semibold text-vw-blue">
                      {formatCurrency(report.total_cost)}
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatDate(report.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button
                        onClick={() => handleViewReport(report.id)}
                        className="p-2 text-gray-400 hover:text-vw-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Report"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toast.success('Download coming soon!')}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {filteredReports.length} of {allReports.length} reports
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}