import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/Spinner';
import { EditBookingModal } from '../components/EditBookingModal';
import { formatDateFr, todayIso } from '../lib/dateUtils';
import type { BookingWithSpot } from '../types/api.types';

type PeriodFilter = 'ALL' | 'UPCOMING' | 'PAST';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée', RESERVED: 'Réservée',
  HELD: 'Retenue', OCCUPIED: 'En cours', BLOCKED: 'Bloquée',
  RELEASED: 'Libérée', CANCELLED: 'Annulée', NO_SHOW: 'Absent',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#3b82f6', RESERVED: '#3b82f6',
  HELD: '#ca8a04', OCCUPIED: '#16a34a', BLOCKED: '#6b7280',
  RELEASED: '#6b7280', CANCELLED: '#dc2626', NO_SHOW: '#9ca3af',
};

export function HistoryPage() {
  const [bookings,      setBookings]      = useState<BookingWithSpot[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [cancelling,    setCancelling]    = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [editBooking,   setEditBooking]   = useState<BookingWithSpot | null>(null);
  const [search,        setSearch]        = useState('');
  const [period,        setPeriod]        = useState<PeriodFilter>('ALL');
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
    setConfirmCancel(null);
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

  // Boutons Modifier/Annuler : uniquement sur ses propres réservations à venir (statut RESERVED).
  // Côté admin, l'édition passe par le Planning (AdminBookingModal), qui cible les bons endpoints.
  const canModify = (b: BookingWithSpot) => !isAdmin && b.status === 'RESERVED';
  const canCancel = canModify;

  /* ── filtrage + tri (vue admin) ── */
  const today = todayIso();
  const displayed = isAdmin
    ? bookings
        .filter(b => {
          if (period === 'UPCOMING' && b.date < today) return false;
          if (period === 'PAST' && b.date >= today) return false;
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            const hay = [b.user?.name, b.user?.trigram, b.spot?.number, b.vehicleLabel]
              .filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    : bookings;

  const periodChip = (key: PeriodFilter, label: string) => (
    <button
      key={key}
      onClick={() => setPeriod(key)}
      style={{
        padding: '6px 12px', borderRadius: '20px',
        border: `1px solid ${period === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: period === key ? 'var(--color-primary)' : 'var(--color-surface)',
        color: period === key ? '#fff' : 'var(--color-text-muted)',
        fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
        {isAdmin ? 'Historique des réservations' : 'Mes réservations'}
      </h1>

      {/* Filtres admin */}
      {isAdmin && !loading && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Utilisateur, trigramme, place, véhicule…"
            style={{
              width: '100%', padding: '10px 14px', boxSizing: 'border-box',
              border: '1px solid var(--color-border)', borderRadius: '8px',
              fontSize: '14px', background: 'var(--color-surface)', color: 'var(--color-text)',
            }}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {periodChip('ALL', 'Toutes')}
            {periodChip('UPCOMING', 'À venir')}
            {periodChip('PAST', 'Passées')}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {displayed.length} résa{displayed.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px', lineHeight: 1 }}>🅿️</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '16px', color: 'var(--color-text)' }}>
            Aucune réservation
          </p>
          <p style={{ margin: '0 0 24px', fontSize: '14px' }}>
            {isAdmin && bookings.length > 0
              ? 'Aucune réservation ne correspond aux filtres.'
              : isAdmin
                ? 'Aucune réservation enregistrée pour le moment.'
                : "Vous n'avez pas encore réservé de place de parking."}
          </p>
          {!isAdmin && (
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
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.map((b) => {
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
                  confirmCancel === b.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                        Annuler cette réservation ?
                      </span>
                      <button
                        onClick={() => setConfirmCancel(null)}
                        style={{
                          padding: '8px 14px',
                          border: '1px solid var(--color-border)', borderRadius: '8px',
                          background: 'var(--color-surface)', color: 'var(--color-text)',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Non
                      </button>
                      <button
                        onClick={() => void handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        style={{
                          padding: '8px 14px',
                          border: 'none', borderRadius: '8px',
                          background: '#dc2626', color: '#fff',
                          fontSize: '13px', fontWeight: 600,
                          cursor: cancelling === b.id ? 'not-allowed' : 'pointer',
                          opacity: cancelling === b.id ? 0.6 : 1,
                        }}
                      >
                        {cancelling === b.id ? '…' : 'Oui, annuler'}
                      </button>
                    </div>
                  ) : (
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
                      onClick={() => setConfirmCancel(b.id)}
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
                  )
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
