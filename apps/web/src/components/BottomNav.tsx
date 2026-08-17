import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { tabsForRole } from './navConfig';

export function BottomNav() {
  const { activeTab, setActiveTab } = useUiStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role !== 'USER';
  const tabs = tabsForRole(isAdmin);

  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(12px)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
        boxShadow: '0 -2px 16px rgba(16,27,45,0.06)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 0 auto', minWidth: '64px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '9px 6px 8px',
              border: 'none',
              background: 'transparent',
              color: active ? 'var(--brand)' : 'var(--color-text-subtle)',
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {active && (
              <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '28px', height: '3px', borderRadius: '0 0 3px 3px', background: 'var(--brand)' }} />
            )}
            <tab.Icon />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
