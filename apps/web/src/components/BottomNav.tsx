import { useUiStore, type Tab } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

/* ── SVG icons ─────────────────────────────────────────────────────────── */
function IconParking({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}
function IconBookings({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function IconPlanning({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconUsers({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconStats({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function IconLogs({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--color-text-muted)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

/* ── Tab definitions ────────────────────────────────────────────────────── */
type TabDef = { id: Tab; label: string; Icon: React.ComponentType<{ active: boolean }> };

const USER_TABS: TabDef[] = [
  { id: 'reservation', label: 'Réservation',     Icon: IconParking  },
  { id: 'my-bookings', label: 'Mes réservations', Icon: IconBookings },
];

const ADMIN_EXTRA: TabDef[] = [
  { id: 'planning', label: 'Planning',     Icon: IconPlanning },
  { id: 'stats',    label: 'Stats',        Icon: IconStats    },
  { id: 'users',    label: 'Utilisateurs', Icon: IconUsers    },
  { id: 'logs',     label: 'Logs',         Icon: IconLogs     },
];

/* ── Component ──────────────────────────────────────────────────────────── */
export function BottomNav() {
  const { activeTab, setActiveTab } = useUiStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role !== 'USER';
  const baseTabs: TabDef[] = isAdmin
    ? USER_TABS.map(t => t.id === 'my-bookings' ? { ...t, label: 'Historique' } : t)
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
            <tab.Icon active={active} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
