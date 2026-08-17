import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { tabsForRole } from './navConfig';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function Sidebar() {
  const { activeTab, setActiveTab, addToast } = useUiStore();
  const { user, logout } = useAuthStore();
  if (!user) return null;

  const isAdmin = user.role !== 'USER';
  const tabs = tabsForRole(isAdmin);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-badge">🅿️</span>
        BoxBox
      </div>

      <div className="sidebar__section">Navigation</div>
      <nav className="sidebar__nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar__item${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.Icon />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className={`avatar${isAdmin ? ' avatar--admin' : ''}`}>{initials(user.name)}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar__user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div className="sidebar__user-role">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
          <button
            className="icon-btn"
            title="Se déconnecter"
            style={{ background: 'transparent', border: '1px solid var(--sidebar-border)', color: 'var(--sidebar-fg-muted)' }}
            onClick={() => { logout(); addToast('Déconnexion réussie', 'success'); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
