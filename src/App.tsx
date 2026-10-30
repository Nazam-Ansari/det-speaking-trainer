import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PracticeHubPage } from './pages/PracticeHubPage';
import { PracticeSessionPage } from './pages/PracticeSessionPage';
import { FullTestPage } from './pages/FullTestPage';
import { TestResultsPage } from './pages/TestResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AttemptDetailPage } from './pages/AttemptDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

export function App() {
  return (
    <SettingsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="practice" element={<PracticeHubPage />} />
            <Route path="practice/:type" element={<PracticeSessionPage />} />
            <Route path="test" element={<FullTestPage />} />
            <Route path="test/results/:id" element={<TestResultsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<AttemptDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
