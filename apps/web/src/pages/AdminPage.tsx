import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import type { Spot } from '../types/api.types';

interface Stats { free: number; reserved: number; occupied: number; blocked: number; total: number }

const SPOT_STATUS: Record<string, { label: string; badge: string }> = {
  FREE:     { label: 'Libre',    badge: 'badge--success' },
  RESERVED: { label: 'Réservée', badge: 'badge--warning' },
  OCCUPIED: { label: 'Occupée',  badge: 'badge--danger' },
  BLOCKED:  { label: 'Bloquée',  badge: 'badge--neutral' },
};

export function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockTarget, setBlockTarget] = useState<Spot | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useUiStore();

  async function load() {
    setLoading(true);
    try {
      const [s, sp] = await Promise.all([api.getAdminStats(), api.getSpots()]);
      setStats(s);
      setSpots(sp);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleBlock() {
    if (!blockTarget || !blockReason.trim()) { addToast('Veuillez indiquer une raison', 'error'); return; }
    setActionLoading(true);
    try {
      await api.blockSpot(blockTarget.id, blockReason.trim());
      addToast(`Place ${blockTarget.number} bloquée`, 'success');
      setBlockTarget(null); setBlockReason('');
      void load();
    } catch (err) { addToast((err as Error).message, 'error'); }
    finally { setActionLoading(false); }
  }

  async function handleUnblock(spot: Spot) {
    setActionLoading(true);
    try {
      await api.unblockSpot(spot.id);
      addToast(`Place ${spot.number} débloquée`, 'success');
      void load();
    } catch (err) { addToast((err as Error).message, 'error'); }
    finally { setActionLoading(false); }
  }

  const occupancy = stats && stats.total > 0
    ? Math.round(((stats.occupied + stats.reserved + stats.blocked) / stats.total) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Places totales', value: stats?.total ?? 0, tone: undefined as string | undefined, icon: '🅿️' },
    { label: 'Libres', value: stats?.free ?? 0, tone: 'var(--status-free-fg)', icon: '✓' },
    { label: 'Réservées', value: stats?.reserved ?? 0, tone: 'var(--status-reserved-fg)', icon: '◔' },
    { label: 'Occupées', value: stats?.occupied ?? 0, tone: 'var(--status-occupied-fg)', icon: '●' },
    { label: 'Bloquées', value: stats?.blocked ?? 0, tone: 'var(--status-blocked-fg)', icon: '⊘' },
    { label: 'Taux d’occupation', value: `${occupancy}%`, tone: 'var(--brand)', icon: '％' },
  ];

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Tableau de bord</h1>
          <p className="page__subtitle">Résumé de l’occupation du parking en temps réel.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={36} /></div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
            {STAT_CARDS.map((sc) => (
              <div key={sc.label} className="stat-card">
                <div className="stat-card__label">{sc.label}</div>
                <div className="stat-card__value" style={sc.tone ? { color: sc.tone } : undefined}>{sc.value}</div>
                <div className="stat-card__icon">{sc.icon}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Gestion des places</div>
                <div className="card__subtitle">Bloquez ou débloquez une place du parking.</div>
              </div>
              <span className="badge badge--neutral badge--none">{stats?.total ?? 0} places</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.map((spot) => {
                    const st = SPOT_STATUS[spot.status] ?? { label: spot.status, badge: 'badge--neutral' };
                    return (
                      <tr key={spot.id}>
                        <td className="cell-strong">
                          Place {spot.number}
                          {spot.label && <span className="cell-muted" style={{ marginLeft: 8, fontWeight: 400 }}>{spot.label}</span>}
                        </td>
                        <td className="cell-muted">{spot.type}</td>
                        <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {spot.status === 'BLOCKED' ? (
                            <button className="btn btn--ghost btn--sm" onClick={() => void handleUnblock(spot)} disabled={actionLoading}>Débloquer</button>
                          ) : spot.status === 'FREE' ? (
                            <button className="btn btn--danger btn--sm" onClick={() => setBlockTarget(spot)}>Bloquer</button>
                          ) : (
                            <span className="cell-muted" style={{ fontSize: 'var(--fs-sm)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!blockTarget}
        onClose={() => { setBlockTarget(null); setBlockReason(''); }}
        title={`Bloquer la place ${blockTarget?.number ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label className="label">Raison</label>
            <input
              className="input"
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex : Maintenance, essai Tesla Model 3…"
              autoFocus
            />
          </div>
          <button
            className="btn btn--danger btn--block"
            onClick={() => void handleBlock()}
            disabled={actionLoading || !blockReason.trim()}
            style={{ padding: '12px' }}
          >
            {actionLoading ? '…' : 'Confirmer le blocage'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
