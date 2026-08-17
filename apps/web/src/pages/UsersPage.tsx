import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import { UserModal } from '../components/UserModal';
import type { User } from '../types/api.types';

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'badge--info',
  ADMIN: 'badge--info',
  USER: 'badge--neutral',
};
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'Utilisateur',
};

function buildActivationLink(token: string) {
  return `${window.location.origin}/?activate=${token}`;
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(buildActivationLink(token));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title={buildActivationLink(token)}
      style={{ fontSize: 'var(--fs-xs)', padding: '4px 10px' }}
    >
      {copied ? '✓ Copié' : '🔗 Lien d’activation'}
    </button>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE' && u.active !== false).length;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Utilisateurs</h1>
          <p className="page__subtitle">Gérez les comptes, les rôles et les accès.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModalUser(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouvel utilisateur
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={36} /></div>
      ) : (
        <div className="card">
          <div className="card__header">
            <div className="card__title">
              {users.length} utilisateur{users.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge--success">{activeCount} actif{activeCount !== 1 ? 's' : ''}</span>
              {pendingCount > 0 && <span className="badge badge--warning">{pendingCount} en attente</span>}
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th style={{ textAlign: 'center' }}>Trigramme</th>
                  <th>Email</th>
                  <th>Profil</th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state__icon">👥</div>Aucun utilisateur</div></td></tr>
                ) : users.map((u) => {
                  const isActive = u.active !== false;
                  const isPending = u.status === 'PENDING';
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="cell-user">
                          <span className={`avatar avatar--sm${isPending ? ' avatar--muted' : (u.role !== 'USER' ? ' avatar--admin' : '')}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="cell-strong" style={!isActive ? { color: 'var(--color-text-subtle)' } : undefined}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {u.trigram
                          ? <span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: '.08em', fontFamily: 'ui-monospace, monospace' }}>{u.trigram}</span>
                          : <span className="cell-muted">—</span>}
                      </td>
                      <td className="cell-muted">{u.email ?? '—'}</td>
                      <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge--neutral'}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          {isPending
                            ? <span className="badge badge--warning">En attente</span>
                            : <span className={`badge ${isActive ? 'badge--success' : 'badge--danger'}`}>{isActive ? 'Actif' : 'Inactif'}</span>}
                          {isPending && u.activationToken && <CopyLinkButton token={u.activationToken} />}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => setModalUser(u)}>Modifier</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserModal
        open={modalUser !== undefined}
        user={modalUser ?? null}
        onClose={() => setModalUser(undefined)}
        onSaved={() => { setModalUser(undefined); void load(); }}
      />
    </div>
  );
}
