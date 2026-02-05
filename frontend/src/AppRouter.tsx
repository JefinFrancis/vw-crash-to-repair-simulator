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

export function AppRouter() {
  return (
    <Routes>
      {/* Welcome page - full screen without sidebar */}
      <Route path="/" element={<WelcomePage />} />
      
      {/* Main app with sidebar */}
      <Route path="/home" element={<Layout />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route path="/results" element={<Layout />}>
        <Route index element={<ResultsPage />} />
      </Route>
      <Route path="/appointment" element={<Layout />}>
        <Route index element={<AppointmentPage />} />
      </Route>
      <Route path="/vehicles" element={<Layout />}>
        <Route index element={<VehicleManagementPage />} />
      </Route>
      <Route path="/dealers" element={<Layout />}>
        <Route index element={<DealerNetworkPage />} />
      </Route>
      <Route path="/parts" element={<Layout />}>
        <Route index element={<PartsPage />} />
      </Route>
      <Route path="/damage-reports" element={<Layout />}>
        <Route index element={<DamageReportsPage />} />
      </Route>
      
      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}