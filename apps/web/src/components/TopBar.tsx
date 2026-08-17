import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin',
};

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { addToast } = useUiStore();
  if (!user) return null;

  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const isAdmin = user.role !== 'USER';

  return (
    <header className="topbar topbar--mobile">
      {/* Spacer safe-area iOS */}
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'env(safe-area-inset-top, 0px)', background: 'var(--color-surface)' }} />

      <div className="topbar__mobile-brand">
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🅿️</span>
        BoxBox
      </div>

      <div className="topbar__spacer" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`avatar avatar--sm${isAdmin ? ' avatar--admin' : ''}`}>{initials}</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
        </div>
        <button
          className="icon-btn"
          title="Se déconnecter"
          onClick={() => { logout(); addToast('Déconnexion réussie', 'success'); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
