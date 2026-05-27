import { useEffect, useState } from 'react';
import { useSpotStore } from '../store/spotStore';
import { useUiStore } from '../store/uiStore';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';
import { formatDateFr, formatTimeFr } from '../lib/dateUtils';
import { useBookings } from '../hooks/useBookings';

export function CheckInPage() {
  const { todayBooking, isLoading } = useSpotStore();
  const { addToast } = useUiStore();
  const { refresh } = useBookings();
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { void refresh(); }, []);

  async function handleCheckIn() {
    if (!todayBooking) return;
    setActionLoading(true);
    try {
      await api.checkIn(todayBooking.id);
      navigator.vibrate?.([100, 50, 100]);
      addToast('Check-in effectué !', 'success');
      void refresh();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRelease() {
    if (!todayBooking) return;
    setActionLoading(true);
    try {
      await api.release(todayBooking.id);
      navigator.vibrate?.([50]);
      addToast('Place libérée', 'success');
      void refresh();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700 }}>Check-in du jour</h1>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : !todayBooking ? (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '48px 24px',
          textAlign: 'center', color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>😊</div>
          <p style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>
            Aucun check-in nécessaire aujourd'hui
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Réservez une place depuis l'onglet Réservation
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ background: 'var(--color-primary)', padding: '20px 24px', color: '#fff' }}>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>
              Place {todayBooking.spot?.number ?? '—'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '4px' }}>
              {formatDateFr(todayBooking.date)} · {todayBooking.spot?.type ?? ''}
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Début</div>
                <div style={{ fontWeight: 600, fontSize: '20px' }}>{todayBooking.startTime}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Fin</div>
                <div style={{ fontWeight: 600, fontSize: '20px' }}>{todayBooking.endTime}</div>
              </div>
            </div>

            {!todayBooking.checkedIn ? (
              <button
                onClick={() => void handleCheckIn()}
                disabled={actionLoading}
                style={{
                  width: '100%', padding: '16px',
                  background: 'var(--color-free)', color: '#fff',
                  border: 'none', borderRadius: '12px',
                  fontSize: '16px', fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {actionLoading ? <Spinner size={18} /> : '✅ Faire le check-in'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 16px', background: 'rgba(22,163,74,0.1)',
                  borderRadius: '10px', color: 'var(--color-free)', fontWeight: 600,
                }}>
                  ✅ Check-in effectué
                  {todayBooking.checkedInAt && (
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      à {formatTimeFr(todayBooking.checkedInAt)}
                    </span>
                  )}
                </div>
                {!todayBooking.releasedAt && (
                  <button
                    onClick={() => void handleRelease()}
                    disabled={actionLoading}
                    style={{
                      width: '100%', padding: '14px',
                      background: 'var(--color-surface)', color: 'var(--color-text)',
                      border: '1px solid var(--color-border)', borderRadius: '12px',
                      fontSize: '15px', fontWeight: 600,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? '…' : '🔓 Libérer la place tôt'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
