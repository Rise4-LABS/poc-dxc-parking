import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import type { AuditLog, LogAction } from '../types/api.types';

/* ─── Config des actions ────────────────────────────────────────────────────── */
const ACTION_CONFIG: Record<LogAction, { label: string; icon: string; color: string; bg: string }> = {
  LOGIN:        { label: 'Connexion',        icon: '🟢', color: '#15803d', bg: '#dcfce7' },
  LOGIN_FAILED: { label: 'Échec connexion',  icon: '🔴', color: '#dc2626', bg: '#fee2e2' },
  LOGOUT:       { label: 'Déconnexion',      icon: '⚪', color: '#6b7280', bg: '#f3f4f6' },
  USER_CREATED: { label: 'Utilisateur créé', icon: '🔵', color: '#1d4ed8', bg: '#dbeafe' },
  USER_UPDATED: { label: 'Utilisateur modifié', icon: '🟡', color: '#b45309', bg: '#fef9c3' },
  USER_DELETED: { label: 'Utilisateur supprimé', icon: '🗑', color: '#7c2d12', bg: '#fee2e2' },
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

  /* ── styles ── */
  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left',
    fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '1px solid var(--color-border)',
    fontSize: '13px', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Logs d'activité</h1>
        <button
          onClick={() => void load()}
          style={{ padding: '8px 14px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-surface)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          🔄 Actualiser
        </button>
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Filtre par type */}
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          {FILTER_OPTIONS.map((opt, i, arr) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              style={{
                padding: '6px 11px',
                border: 'none',
                borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: filter === opt.key ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === opt.key ? '#fff' : 'var(--color-text)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, identifiant…"
          style={{
            padding: '7px 12px', border: '1px solid var(--color-border)',
            borderRadius: '8px', fontSize: '13px',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            minWidth: '220px', flex: 1,
          }}
        />
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
                <th style={th}>Horodatage</th>
                <th style={th}>Utilisateur</th>
                <th style={th}>Identifiant</th>
                <th style={th}>Action</th>
                <th style={th}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>
                    {logs.length === 0 ? 'Aucun événement enregistré pour cette session.' : 'Aucun résultat pour ce filtre.'}
                  </td>
                </tr>
              ) : filtered.map(log => {
                const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: '•', color: '#374151', bg: '#f3f4f6' };
                return (
                  <tr key={log.id} style={{ background: 'var(--color-surface)' }}>

                    {/* Horodatage */}
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatDate(log.timestamp)}
                    </td>

                    {/* Utilisateur */}
                    <td style={td}>
                      {log.userName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: log.action === 'LOGIN_FAILED' ? '#fee2e2' : 'var(--color-primary)',
                            color: log.action === 'LOGIN_FAILED' ? '#dc2626' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {log.userName.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 500 }}>{log.userName}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Identifiant */}
                    <td style={td}>
                      {log.accessId ? (
                        <code style={{
                          background: 'var(--color-surface-2)', padding: '2px 7px',
                          borderRadius: '5px', fontSize: '12px', fontWeight: 700,
                        }}>
                          {log.accessId}
                        </code>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '20px',
                        background: cfg.bg, color: cfg.color,
                        fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* Détail */}
                    <td style={{ ...td, color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {log.detail ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px', color: 'var(--color-text-muted)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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
