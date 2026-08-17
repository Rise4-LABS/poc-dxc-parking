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

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge--warning', CONFIRMED: 'badge--info', RESERVED: 'badge--info',
  HELD: 'badge--warning', OCCUPIED: 'badge--success', BLOCKED: 'badge--neutral',
  RELEASED: 'badge--neutral', CANCELLED: 'badge--danger', NO_SHOW: 'badge--neutral',
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
      className={`chip${period === key ? ' is-active' : ''}`}
      onClick={() => setPeriod(key)}
      style={{ whiteSpace: 'nowrap' }}
    >
      {label}
    </button>
  );

  return (
    <div className="page" style={{ maxWidth: '720px' }}>
      <div className="page__header">
        <div>
          <h1 className="page__title">{isAdmin ? 'Historique des réservations' : 'Mes réservations'}</h1>
          <p className="page__subtitle">
            {isAdmin ? 'Toutes les réservations du parking.' : 'Vos réservations à venir et passées.'}
          </p>
        </div>
      </div>

      {/* Filtres admin */}
      {isAdmin && !loading && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <div className="input-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="input"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Utilisateur, trigramme, place, véhicule…"
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {periodChip('ALL', 'Toutes')}
            {periodChip('UPCOMING', 'À venir')}
            {periodChip('PAST', 'Passées')}
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)' }}>
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
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">🅿️</div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 'var(--fs-md)', color: 'var(--color-text)' }}>
              Aucune réservation
            </p>
            <p style={{ margin: '0 0 var(--space-6)', fontSize: 'var(--fs-base)' }}>
              {isAdmin && bookings.length > 0
                ? 'Aucune réservation ne correspond aux filtres.'
                : isAdmin
                  ? 'Aucune réservation enregistrée pour le moment.'
                  : "Vous n'avez pas encore réservé de place de parking."}
            </p>
            {!isAdmin && (
              <button className="btn btn--primary" onClick={() => setActiveTab('reservation')}>
                🅿️ Réserver une place
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {displayed.map((b) => {
            const color = STATUS_COLORS[b.status] ?? '#6b7280';
            void color;
            return (
              <div key={b.id} className="card">
                <div className="card__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>
                        Place {b.spot?.number ?? '—'}
                        {b.spot?.type && (
                          <span style={{ fontWeight: 400, fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                            {b.spot.type}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', marginTop: '3px' }}>
                        {formatDateFr(b.date)} · {b.startTime}–{b.endTime}
                      </div>
                      {isAdmin && b.user && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)', marginTop: '2px' }}>
                          👤 {b.user.name}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge--neutral'}`} style={{ flexShrink: 0 }}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </div>
                  {canModify(b) && (
                    confirmCancel === b.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--status-occupied-fg)' }}>
                          Annuler cette réservation ?
                        </span>
                        <button className="btn btn--ghost btn--sm" onClick={() => setConfirmCancel(null)}>
                          Non
                        </button>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => void handleCancel(b.id)}
                          disabled={cancelling === b.id}
                        >
                          {cancelling === b.id ? '…' : 'Oui, annuler'}
                        </button>
                      </div>
                    ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setEditBooking(b)} style={{ flex: 1 }}>
                        ✏️ Modifier
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setConfirmCancel(b.id)}
                        disabled={cancelling === b.id}
                        style={{ flex: 1, color: 'var(--color-text-muted)' }}
                      >
                        {cancelling === b.id ? '…' : '✕ Annuler'}
                      </button>
                    </div>
                    )
                  )}
                </div>
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
