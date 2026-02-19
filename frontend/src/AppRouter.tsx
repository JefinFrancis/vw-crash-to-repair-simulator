import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { WelcomePage } from './pages/WelcomePage'
import { LandingPage } from './pages/LandingPage'
import { ResultsPage } from './pages/ResultsPage'
import { AppointmentPage } from './pages/AppointmentPage'
import { VehicleManagementPage } from './pages/VehicleManagementPage'
import { DealerNetworkPage } from './pages/DealerNetworkPage'
import { PartsPage } from './pages/PartsPage'
import { DamageReportsPage } from './pages/DamageReportsPage'
import { CustomerManagementPage } from './pages/CustomerManagementPage'
import { AnalysisPage } from './pages/AnalysisPage'

export function AppRouter() {
  return (
    <Routes>
      {/* Welcome page - full screen, no sidebar/header */}
      <Route path="/" element={<WelcomePage />} />

      {/* App pages with Layout (sidebar + header) */}
      <Route element={<Layout />}>
        <Route path="home" element={<LandingPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="appointment" element={<AppointmentPage />} />

        {/* Management pages */}
        <Route path="customers" element={<CustomerManagementPage />} />
        <Route path="vehicles" element={<VehicleManagementPage />} />
        <Route path="dealers" element={<DealerNetworkPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="damage-reports" element={<DamageReportsPage />} />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
