import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import AuthGate from './auth/AuthGate';
import { SetupNeededScreen } from './auth/screens';
import { isFirebaseConfigured } from './firebase/config';
import HabitListPage from './pages/HabitListPage';
import HabitEditPage from './pages/HabitEditPage';
import HabitDetailPage from './pages/HabitDetailPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  if (!isFirebaseConfigured) return <SetupNeededScreen />;
  return (
    <AuthProvider>
      <AuthGate>
        <Routes>
          <Route path="/" element={<HabitListPage />} />
          <Route path="/habit/new" element={<HabitEditPage />} />
          <Route path="/habit/:id" element={<HabitDetailPage />} />
          <Route path="/habit/:id/edit" element={<HabitEditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthGate>
    </AuthProvider>
  );
}
