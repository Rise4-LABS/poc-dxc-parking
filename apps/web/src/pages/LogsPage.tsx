import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import type { AuditLog, LogAction } from '../types/api.types';

/* ─── Config des actions ────────────────────────────────────────────────────── */
const ACTION_CONFIG: Record<LogAction, { label: string; badge: string }> = {
  LOGIN:        { label: 'Connexion',            badge: 'badge--info' },
  LOGIN_FAILED: { label: 'Échec connexion',      badge: 'badge--danger' },
  LOGOUT:       { label: 'Déconnexion',          badge: 'badge--neutral' },
  USER_CREATED: { label: 'Utilisateur créé',     badge: 'badge--success' },
  USER_UPDATED: { label: 'Utilisateur modifié',  badge: 'badge--warning' },
  USER_DELETED: { label: 'Utilisateur supprimé', badge: 'badge--danger' },
};

const FILTER_OPTIONS: { key: 'ALL' | LogAction; label: string }[] = [
  { key: 'ALL',          label: 'Tous' },
  { key: 'LOGIN',        label: 'Connexions' },
  { key: 'LOGIN_FAILED', label: 'Échecs' },
  { key: 'LOGOUT',       label: 'Déconnexions' },
  { key: 'USER_CREATED', label: 'Créations' },
  { key: 'USER_UPDATED', label: 'Modifications' },
  { key: 'USER_DELETED', label: 'Suppressions' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function LogsPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'ALL' | LogAction>('ALL');
  const [search,  setSearch]  = useState('');
  const { addToast } = useUiStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await api.getLogs());
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void load(); }, [load]);

  /* ── filtrage ── */
  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.action !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.userName?.toLowerCase().includes(q) ||
        l.accessId?.toLowerCase().includes(q) ||
        l.detail?.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page__header">
        <div>
          <h1 className="page__title">Logs d'activité</h1>
          <p className="page__subtitle">Historique des connexions et actions de la session en cours.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => void load()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : (
        <div className="card">

          {/* ── Toolbar : filtres + recherche ── */}
          <div className="toolbar">
            <div className="segmented">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={filter === opt.key ? 'is-active' : ''}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="input-search toolbar__grow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                className="input"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, identifiant…"
              />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Utilisateur</th>
                  <th>Identifiant</th>
                  <th>Détail</th>
                  <th style={{ textAlign: 'right' }}>Horodatage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state__icon">📋</div>
                        {logs.length === 0 ? 'Aucun événement enregistré pour cette session.' : 'Aucun résultat pour ce filtre.'}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(log => {
                  const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, badge: 'badge--neutral' };
                  return (
                    <tr key={log.id}>

                      {/* Action */}
                      <td>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </td>

                      {/* Utilisateur */}
                      <td>
                        {log.userName ? (
                          <div className="cell-user">
                            <span className={`avatar avatar--sm${log.action === 'LOGIN_FAILED' ? ' avatar--muted' : ''}`}>
                              {log.userName.charAt(0).toUpperCase()}
                            </span>
                            <span className="cell-strong">{log.userName}</span>
                          </div>
                        ) : (
                          <span className="cell-muted" style={{ fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Identifiant */}
                      <td>
                        {log.accessId ? (
                          <code style={{
                            background: 'var(--color-surface-3)', padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)', fontWeight: 700,
                            letterSpacing: '.04em', fontFamily: 'ui-monospace, monospace',
                          }}>
                            {log.accessId}
                          </code>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>

                      {/* Détail */}
                      <td className="cell-muted">{log.detail ?? '—'}</td>

                      {/* Horodatage */}
                      <td className="cell-muted" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>
                        {formatDate(log.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
          }}>
            <span>
              {filtered.length} événement{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
              {filter !== 'ALL' || search ? ` (sur ${logs.length} au total)` : ''}
            </span>
            <span style={{ fontStyle: 'italic' }}>Données de la session en cours uniquement</span>
          </div>
        </div>
      )}
    </div>
  );
}
