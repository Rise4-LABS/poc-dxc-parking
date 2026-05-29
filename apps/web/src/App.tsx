import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { LoginPage } from './pages/LoginPage';
import { ActivationPage } from './pages/ActivationPage';
import { SpotGridPage } from './pages/SpotGridPage';
import { HistoryPage } from './pages/HistoryPage';
import { PlanningPage } from './pages/PlanningPage';
import { UsersPage } from './pages/UsersPage';
import { LogsPage } from './pages/LogsPage';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/TopBar';
import { Toast } from './components/Toast';

export function App() {
  const { user, accessToken } = useAuthStore();
  const { activeTab } = useUiStore();

  // Lien d'activation dans l'URL (?activate=TOKEN)
  const activateToken = new URLSearchParams(window.location.search).get('activate');

  if (!user) {
    if (activateToken) return <ActivationPage token={activateToken} />;
    return <LoginPage />;
  }

  const isAdmin = user.role !== 'USER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopBar />
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        {activeTab === 'reservation'  && <SpotGridPage />}
        {activeTab === 'my-bookings' && <HistoryPage />}
        {activeTab === 'planning'    && isAdmin && <PlanningPage />}
        {activeTab === 'users'       && isAdmin && <UsersPage />}
        {activeTab === 'logs'        && isAdmin && <LogsPage />}
      </main>
      <BottomNav />
      <Toast />
    </div>
  );
}
