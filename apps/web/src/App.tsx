import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { LoginPage } from './pages/LoginPage';
import { ActivationPage } from './pages/ActivationPage';
import { SpotGridPage } from './pages/SpotGridPage';
import { HistoryPage } from './pages/HistoryPage';
import { PlanningPage } from './pages/PlanningPage';
import { AdminPage } from './pages/AdminPage';
import { UsersPage } from './pages/UsersPage';
import { LogsPage } from './pages/LogsPage';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Toast } from './components/Toast';

export function App() {
  const { user } = useAuthStore();
  const { activeTab } = useUiStore();

  // Lien d'activation dans l'URL (?activate=TOKEN)
  const activateToken = new URLSearchParams(window.location.search).get('activate');

  if (!user) {
    if (activateToken) return <ActivationPage token={activateToken} />;
    return <LoginPage />;
  }

  const isAdmin = user.role !== 'USER';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <TopBar />
        <main className="app-content">
          {activeTab === 'reservation' && <SpotGridPage />}
          {activeTab === 'my-bookings' && <HistoryPage />}
          {activeTab === 'planning' && isAdmin && <PlanningPage />}
          {activeTab === 'stats' && isAdmin && <AdminPage />}
          {activeTab === 'users' && isAdmin && <UsersPage />}
          {activeTab === 'logs' && isAdmin && <LogsPage />}
        </main>
        <BottomNav />
      </div>
      <Toast />
    </div>
  );
}
