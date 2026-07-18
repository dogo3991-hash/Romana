import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { queryClient } from '@renderer/lib/queryClient'
import { AuthProvider } from '@renderer/auth/AuthProvider'
import { RequireAuth } from '@renderer/auth/RequireAuth'
import { RequireAdmin } from '@renderer/auth/RequireAdmin'
import { AppShell } from '@renderer/components/AppShell'
import { CompanyProvider } from '@renderer/features/companies/CompanyContext'
import { DailyEntryScreen } from '@renderer/features/daily-entry/DailyEntryScreen'
import { MonthlySummaryScreen } from '@renderer/features/monthly-summary/MonthlySummaryScreen'
import { HistoricalBackfillScreen } from '@renderer/features/historical-backfill/HistoricalBackfillScreen'
import { AdminScreen } from '@renderer/features/admin/AdminScreen'
import { ReportsScreen } from '@renderer/features/reports/ReportsScreen'
import { ConductorsScreen } from '@renderer/features/conductors/ConductorsScreen'
import { TrucksScreen } from '@renderer/features/trucks/TrucksScreen'
import { TicketPrintPage } from '@renderer/features/daily-entry/TicketPrintPage'

function MainApp(): React.JSX.Element {
  return (
    <RequireAuth>
      <CompanyProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<DailyEntryScreen />} />
            <Route path="/conductores" element={<ConductorsScreen />} />
            <Route path="/camiones" element={<TrucksScreen />} />
            <Route path="/informes" element={<ReportsScreen />} />
            <Route path="/resumen-mensual" element={<MonthlySummaryScreen />} />
            <Route path="/historico" element={<HistoricalBackfillScreen />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminScreen />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </CompanyProvider>
    </RequireAuth>
  )
}

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route
              path="/ticket-print"
              element={
                <RequireAuth>
                  <TicketPrintPage />
                </RequireAuth>
              }
            />
            <Route path="/*" element={<MainApp />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
