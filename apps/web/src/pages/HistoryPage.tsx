import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/Spinner';
import { EditBookingModal } from '../components/EditBookingModal';
import { formatDateFr } from '../lib/dateUtils';
import type { BookingWithSpot } from '../types/api.types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée',
  HELD: 'Retenue', OCCUPIED: 'En cours',
  RELEASED: 'Libérée', CANCELLED: 'Annulée', NO_SHOW: 'Absent',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#3b82f6',
  HELD: '#ca8a04', OCCUPIED: '#16a34a',
  RELEASED: '#6b7280', CANCELLED: '#dc2626', NO_SHOW: '#9ca3af',
};

export function HistoryPage() {
  const [bookings,     setBookings]     = useState<BookingWithSpot[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [cancelling,   setCancelling]   = useState<string | null>(null);
  const [editBooking,  setEditBooking]  = useState<BookingWithSpot | null>(null);
  const { addToast, setActiveTab } = useUiStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role !== 'USER';

  async function load() {
    setLoading(true);
    try {
      if (isAdmin) {
        setBookings(await api.getAllBookings('2020-01-01', '2030-12-31'));
      } else {
        setBookings(await api.getMyBookings());
      }
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCancel(id: string) {
    setCancelling(id);
    try {
      await api.cancelBooking(id);
      addToast('Réservation annulée', 'success');
      void load();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setCancelling(null);
    }
  }

  const canModify = (b: BookingWithSpot) => ['PENDING', 'CONFIRMED', 'HELD'].includes(b.status);
  const canCancel = canModify;

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
        {isAdmin ? 'Historique des réservations' : 'Mes réservations'}
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px', lineHeight: 1 }}>🅿️</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '16px', color: 'var(--color-text)' }}>
            Aucune réservation
          </p>
          <p style={{ margin: '0 0 24px', fontSize: '14px' }}>
            Vous n'avez pas encore réservé de place de parking.
          </p>
          <button
            onClick={() => setActiveTab('reservation')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 22px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            🅿️ Réserver une place
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {bookings.map((b) => {
            const color = STATUS_COLORS[b.status] ?? '#6b7280';
            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: '12px', padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>
                      Place {b.spot?.number ?? '—'}
                      {b.spot?.type && (
                        <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                          {b.spot.type}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '3px' }}>
                      {formatDateFr(b.date)} · {b.startTime}–{b.endTime}
                    </div>
                    {isAdmin && b.user && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '2px' }}>
                        👤 {b.user.name}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, flexShrink: 0,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: `${color}22`, color,
                  }}>
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </div>
                {canModify(b) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => setEditBooking(b)}
                      style={{
                        flex: 1, padding: '8px 14px',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '8px',
                        background: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => void handleCancel(b.id)}
                      disabled={cancelling === b.id}
                      style={{
                        flex: 1, padding: '8px 14px',
                        border: '1px solid var(--color-border)', borderRadius: '8px',
                        background: 'transparent', color: 'var(--color-text-muted)',
                        fontSize: '13px', fontWeight: 500, cursor: cancelling === b.id ? 'not-allowed' : 'pointer',
                        opacity: cancelling === b.id ? 0.6 : 1,
                      }}
                    >
                      {cancelling === b.id ? '…' : '✕ Annuler'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <EditBookingModal
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={() => { setEditBooking(null); void load(); }}
      />
    </div>
  );
}
