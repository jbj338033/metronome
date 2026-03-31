import { Routes, Route } from 'react-router'
import { RootLayout } from '@/widgets/layout/ui'
import { LivePage } from '@/pages/live/ui'
import { LaunchPage } from '@/pages/launch/ui'
import { HistoryPage } from '@/pages/history/ui'
import { ConfigPage } from '@/pages/config/ui'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<LivePage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="live/:runId" element={<LivePage />} />
        <Route path="launch" element={<LaunchPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="config" element={<ConfigPage />} />
      </Route>
    </Routes>
  )
}
