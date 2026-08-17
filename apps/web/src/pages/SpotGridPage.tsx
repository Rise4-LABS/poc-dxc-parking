import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../services/api';
import { useSpotStore } from '../store/spotStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useBookings } from '../hooks/useBookings';
import { SpotCard } from '../components/SpotCard';
import { BookingSheet } from '../components/BookingSheet';
import { Spinner } from '../components/Spinner';
import type { Spot } from '../types/api.types';
import { todayIso } from '../lib/dateUtils';

const TYPE_ORDER = ['LOT1', 'LOT2', 'BOX'];
const TYPE_LABELS: Record<string, string> = {
  LOT1: 'Chêne-Bourg Lot 1',
  LOT2: 'Chêne-Bourg Lot 2',
  BOX:  'Chêne-Bourg Box',
};

export function SpotGridPage() {
  const { spots, myBookings, setSpots, isLoading, setLoading, setError } = useSpotStore();
  const { addToast, setActiveTab } = useUiStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role !== 'USER';
  const [date, setDate] = useState(todayIso());

  // Ma réservation pour la date affichée
  const myBookingForDate = myBookings.find(
    b => b.date === date && !['CANCELLED', 'RELEASED'].includes(b.status),
  ) ?? null;

  // Les utilisateurs ne voient que les places libres
  const visibleSpots = isAdmin ? spots : spots.filter(s => s.status === 'FREE');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const { refresh: refreshBookings } = useBookings();

  async function load(d: string) {
    setLoading(true);
    try {
      setSpots(await api.getSpots(d));
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(date); }, [date]);

  const grouped = visibleSpots.reduce<Record<string, Spot[]>>((acc, s) => {
    (acc[s.type] ??= []).push(s);
    return acc;
  }, {});

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  const arrowBtn: CSSProperties = {
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)', color: 'var(--color-text-muted)',
    fontSize: '18px', cursor: 'pointer', flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div className="page" style={{ maxWidth: '640px' }}>
      <div className="page__header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="page__title">Réservation</h1>
          <p className="page__subtitle">Choisissez une place libre pour la date sélectionnée.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="icon-btn" style={arrowBtn} onClick={() => shiftDate(-1)} title="Jour précédent">‹</button>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 'auto', fontSize: 'var(--fs-sm)' }}
          />
          <button className="icon-btn" style={arrowBtn} onClick={() => shiftDate(1)} title="Jour suivant">›</button>
        </div>
      </div>

      {/* Ma réservation pour cette date */}
      {myBookingForDate && (
        <button
          onClick={() => setActiveTab('my-bookings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            width: '100%', padding: 'var(--space-3) var(--space-4)', boxSizing: 'border-box',
            marginBottom: 'var(--space-5)',
            background: 'var(--status-free-bg)', border: '1px solid var(--status-free-fg)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ flex: 1, fontSize: 'var(--fs-base)', color: 'var(--status-free-fg)' }}>
            <strong>Place {myBookingForDate.spot?.number ?? '—'}</strong> réservée
            {date === todayIso() ? " aujourd'hui" : ' ce jour'} · {myBookingForDate.startTime}–{myBookingForDate.endTime}
          </span>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--status-free-fg)', opacity: 0.85, whiteSpace: 'nowrap', fontWeight: 600 }}>Gérer ›</span>
        </button>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : visibleSpots.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">🅿️</div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text)' }}>Aucune place disponible</p>
            <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-sm)' }}>Toutes les places sont réservées pour cette date.</p>
          </div>
        </div>
      ) : (
        TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => (
          <div key={type} style={{ marginBottom: 'var(--space-8)' }}>
            {/* Section header with divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <span style={{
                fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--color-text-subtle)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}>
                {TYPE_LABELS[type]}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span className="badge badge--success badge--none" style={{ whiteSpace: 'nowrap' }}>
                {grouped[type].filter(s => s.status === 'FREE').length} libre{grouped[type].filter(s => s.status === 'FREE').length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
              {grouped[type].map((spot) => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  selected={selectedSpot?.id === spot.id}
                  onClick={spot.status === 'FREE' ? () => setSelectedSpot(spot) : undefined}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <BookingSheet
        spot={selectedSpot}
        date={date}
        onClose={() => setSelectedSpot(null)}
        onBooked={() => {
          setSelectedSpot(null);
          void load(date);
          void refreshBookings();
        }}
      />
    </div>
  );
}
