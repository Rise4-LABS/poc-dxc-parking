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
    <div className="page" style={{ maxWidth: '520px' }}>
      <div className="page__header">
        <div>
          <h1 className="page__title">Check-in du jour</h1>
          <p className="page__subtitle">Confirmez votre arrivée sur votre place réservée.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : !todayBooking ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">😊</div>
            <p style={{ margin: '0 0 6px', fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--color-text)' }}>
              Aucun check-in nécessaire aujourd'hui
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-base)' }}>
              Réservez une place depuis l'onglet Réservation
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ background: 'var(--brand)', padding: 'var(--space-5) var(--space-6)', color: '#fff' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-.02em' }}>
              Place {todayBooking.spot?.number ?? '—'}
            </div>
            <div style={{ fontSize: 'var(--fs-base)', opacity: 0.85, marginTop: '4px' }}>
              {formatDateFr(todayBooking.date)} · {todayBooking.spot?.type ?? ''}
            </div>
          </div>

          <div className="card__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Début</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-xl)' }}>{todayBooking.startTime}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Fin</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-xl)' }}>{todayBooking.endTime}</div>
              </div>
            </div>

            {!todayBooking.checkedIn ? (
              <button
                className="btn btn--primary btn--block"
                onClick={() => void handleCheckIn()}
                disabled={actionLoading}
                style={{ padding: 'var(--space-4)', fontSize: 'var(--fs-md)' }}
              >
                {actionLoading ? <Spinner size={18} /> : '✅ Faire le check-in'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)', background: 'var(--status-free-bg)',
                  borderRadius: 'var(--radius-md)', color: 'var(--status-free-fg)', fontWeight: 600,
                }}>
                  ✅ Check-in effectué
                  {todayBooking.checkedInAt && (
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
                      à {formatTimeFr(todayBooking.checkedInAt)}
                    </span>
                  )}
                </div>
                {!todayBooking.releasedAt && (
                  <button
                    className="btn btn--ghost btn--block"
                    onClick={() => void handleRelease()}
                    disabled={actionLoading}
                    style={{ padding: 'var(--space-3)' }}
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
