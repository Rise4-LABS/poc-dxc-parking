import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const ROLE_LABELS: Record<string, string> = {
  USER:        'Utilisateur',
  ADMIN:       'Administrateur',
  SUPER_ADMIN: 'Super admin',
};

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { addToast } = useUiStore();

  function handleLogout() {
    logout();
    addToast('Déconnexion réussie', 'success');
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = user.role !== 'USER';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '54px',
      background: 'var(--color-primary)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🅿️</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
          DXC Parking
        </span>
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: isAdmin ? '#f59e0b' : 'rgba(255,255,255,0.2)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {user.name.split(' ')[0]}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Se déconnecter"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '12px', fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.45)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
          }}
        >
          <span style={{ fontSize: '14px' }}>⎋</span>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
