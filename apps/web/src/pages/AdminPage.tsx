import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import type { Spot } from '../types/api.types';

interface Stats { free: number; reserved: number; occupied: number; blocked: number; total: number }

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

  const STAT_CARDS = [
    { label: 'Libres', key: 'free' as const, color: 'var(--color-free)' },
    { label: 'Réservées', key: 'reserved' as const, color: 'var(--color-reserved)' },
    { label: 'Occupées', key: 'occupied' as const, color: 'var(--color-occupied)' },
    { label: 'Bloquées', key: 'blocked' as const, color: 'var(--color-blocked)' },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Administration</h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={36} /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {STAT_CARDS.map((sc) => (
              <div key={sc.key} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '12px', padding: '16px 20px',
                borderLeft: `4px solid ${sc.color}`,
              }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: sc.color }}>{stats?.[sc.key] ?? 0}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sc.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Gestion des places</h2>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{stats?.total ?? 0} places</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {spots.map((spot) => (
              <div key={spot.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '10px', padding: '12px 16px',
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{spot.number}</span>
                  {spot.label && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginLeft: '8px' }}>
                      {spot.label}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', marginLeft: '8px', color: 'var(--color-text-muted)' }}>
                    {spot.type}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600,
                    color: spot.status === 'BLOCKED' ? 'var(--color-blocked)' :
                      spot.status === 'FREE' ? 'var(--color-free)' : 'var(--color-text-muted)',
                  }}>
                    {spot.status}
                  </span>
                  {spot.status === 'BLOCKED' ? (
                    <button
                      onClick={() => void handleUnblock(spot)}
                      disabled={actionLoading}
                      style={{
                        padding: '5px 12px', border: '1px solid var(--color-border)',
                        borderRadius: '6px', background: 'transparent', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Débloquer
                    </button>
                  ) : spot.status === 'FREE' ? (
                    <button
                      onClick={() => setBlockTarget(spot)}
                      style={{
                        padding: '5px 12px', border: '1px solid rgba(220,38,38,0.3)',
                        borderRadius: '6px', background: 'rgba(220,38,38,0.08)',
                        color: '#dc2626', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Bloquer
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!blockTarget}
        onClose={() => { setBlockTarget(null); setBlockReason(''); }}
        title={`Bloquer la place ${blockTarget?.number ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Raison</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex : Maintenance, essai Tesla Model 3…"
              autoFocus
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--color-border)', borderRadius: '8px',
                fontSize: '15px', background: 'var(--color-surface)', color: 'var(--color-text)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={() => void handleBlock()}
            disabled={actionLoading || !blockReason.trim()}
            style={{
              padding: '12px', background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
              cursor: (actionLoading || !blockReason.trim()) ? 'not-allowed' : 'pointer',
              opacity: (actionLoading || !blockReason.trim()) ? 0.6 : 1,
            }}
          >
            {actionLoading ? '…' : 'Confirmer le blocage'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
