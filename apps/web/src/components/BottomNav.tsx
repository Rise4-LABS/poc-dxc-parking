import { useUiStore, type Tab } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

const USER_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'reservation', label: 'Réservation', icon: '🅿️' },
  { id: 'my-bookings', label: 'Mes réservations', icon: '📋' },
];

const ADMIN_EXTRA: { id: Tab; label: string; icon: string }[] = [
  { id: 'planning', label: 'Planning',     icon: '📅' },
  { id: 'users',    label: 'Utilisateurs', icon: '👥' },
  { id: 'logs',     label: 'Logs',         icon: '📋' },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useUiStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role !== 'USER';
  const baseTabs = isAdmin
    ? USER_TABS.map(t => t.id === 'my-bookings' ? { ...t, label: 'Historique', icon: '📋' } : t)
    : USER_TABS;
  const tabs = isAdmin ? [...baseTabs, ...ADMIN_EXTRA] : baseTabs;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
    }}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '10px 4px',
              border: 'none',
              borderTop: active ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'transparent',
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '10px',
              fontWeight: active ? 700 : 400,
              transition: 'color 0.15s, border-color 0.15s',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: '20px',
              lineHeight: 1,
              filter: active ? 'none' : 'grayscale(0.4) opacity(0.7)',
              transition: 'filter 0.15s',
            }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
