import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { SimulationPage } from './pages/SimulationPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { ResultsPage } from './pages/ResultsPage'
import { AppointmentPage } from './pages/AppointmentPage'
import { DealerNetworkPage } from './pages/DealerNetworkPage'
import { VehicleManagementPage } from './pages/VehicleManagementPage'
import { PartsPage } from './pages/PartsPage'
import { DamageReportsPage } from './pages/DamageReportsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/dealers" element={<DealerNetworkPage />} />
        <Route path="/appointment" element={<AppointmentPage />} />
        {/* Management Routes */}
        <Route path="/vehicles" element={<VehicleManagementPage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/reports" element={<DamageReportsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}