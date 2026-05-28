import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import { UserModal } from '../components/UserModal';
import type { User } from '../types/api.types';

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#7c3aed', bg: '#f5f3ff' },
  ADMIN:       { label: 'Admin',       color: '#1d4ed8', bg: '#eff6ff' },
  USER:        { label: 'Utilisateur', color: '#374151', bg: '#f3f4f6' },
};

function buildActivationLink(token: string) {
  return `${window.location.origin}/?activate=${token}`;
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(buildActivationLink(token));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title={buildActivationLink(token)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px',
        border: `1px solid ${copied ? '#86efac' : '#fde68a'}`,
        borderRadius: '20px',
        background: copied ? '#f0fdf4' : '#fffbeb',
        color: copied ? '#16a34a' : '#92400e',
        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Copié' : '📋 Lien d\'activation'}
    </button>
  );
}

export function UsersPage() {
  const [users,     setUsers]     = useState<User[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalUser, setModalUser] = useState<User | null | undefined>(undefined); // undefined = fermé, null = création
  const { addToast } = useUiStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void load(); }, [load]);

  /* ── styles ── */
  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left',
    fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '12px 14px', borderBottom: '1px solid var(--color-border)',
    fontSize: '14px', verticalAlign: 'middle',
  };

  const pendingCount = users.filter(u => u.status === 'PENDING').length;

  return (
    <div style={{ padding: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Utilisateurs</h1>
          {pendingCount > 0 && (
            <span style={{
              padding: '3px 9px', borderRadius: '20px',
              background: '#fffbeb', color: '#92400e',
              border: '1px solid #fde68a',
              fontSize: '12px', fontWeight: 600,
            }}>
              ⏳ {pendingCount} en attente
            </span>
          )}
        </div>
        <button
          onClick={() => setModalUser(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Nouvel utilisateur
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : (
        <div style={{ borderRadius: '10px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Nom complet</th>
                <th style={th}>Email</th>
                <th style={th}>Profil</th>
                <th style={{ ...th, textAlign: 'center' }}>Statut</th>
                <th style={{ ...th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>
                    Aucun utilisateur
                  </td>
                </tr>
              ) : users.map((u, idx) => {
                const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.USER;
                const isActive = u.active !== false;
                const isPending = u.status === 'PENDING';
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={u.id}
                    style={{
                      background: isPending
                        ? '#fffdf0'
                        : !isActive
                          ? '#fff5f5'
                          : isEven
                            ? 'var(--color-surface)'
                            : 'var(--color-surface-2)',
                    }}
                  >
                    {/* Nom */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: isPending ? '#fde68a' : isActive ? 'var(--color-primary)' : '#e5e7eb',
                          color: isPending ? '#92400e' : isActive ? '#fff' : '#9ca3af',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 600, color: isActive ? 'var(--color-text)' : '#9ca3af' }}>
                          {u.name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={td}>
                      <span style={{
                        fontSize: '13px',
                        color: isActive ? 'var(--color-text-muted)' : '#9ca3af',
                      }}>
                        {u.email ?? '—'}
                      </span>
                    </td>

                    {/* Profil */}
                    <td style={td}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px', borderRadius: '20px',
                        background: roleInfo.bg, color: roleInfo.color,
                        fontSize: '12px', fontWeight: 600,
                      }}>
                        {roleInfo.label}
                      </span>
                    </td>

                    {/* Statut */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        {isPending ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: '#fffbeb', color: '#92400e',
                            border: '1px solid #fde68a',
                          }}>
                            ⏳ En attente
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#16a34a' : '#dc2626',
                          }}>
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: isActive ? '#16a34a' : '#dc2626',
                              display: 'inline-block',
                            }} />
                            {isActive ? 'Actif' : 'Inactif'}
                          </span>
                        )}
                        {/* Bouton copier lien pour les users en attente */}
                        {isPending && u.activationToken && (
                          <CopyLinkButton token={u.activationToken} />
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => setModalUser(u)}
                        style={{
                          padding: '7px 14px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '7px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✏️ Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer count */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px', color: 'var(--color-text-muted)',
          }}>
            {users.length} utilisateur{users.length !== 1 ? 's' : ''} —{' '}
            {users.filter(u => u.status === 'ACTIVE' && u.active !== false).length} actif{users.filter(u => u.status === 'ACTIVE' && u.active !== false).length !== 1 ? 's' : ''}{pendingCount > 0 ? ` · ${pendingCount} en attente d'activation` : ''}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      <UserModal
        open={modalUser !== undefined}
        user={modalUser ?? null}
        onClose={() => setModalUser(undefined)}
        onSaved={() => { setModalUser(undefined); void load(); }}
      />
    </div>
  );
}
