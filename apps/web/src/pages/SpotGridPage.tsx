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
    width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--color-border)', borderRadius: '8px',
    background: 'var(--color-surface)', color: 'var(--color-text)',
    fontSize: '16px', cursor: 'pointer', flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Réservation</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button style={arrowBtn} onClick={() => shiftDate(-1)} title="Jour précédent">‹</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid var(--color-border)',
              borderRadius: '8px', fontSize: '13px',
              background: 'var(--color-surface)', color: 'var(--color-text)',
            }}
          />
          <button style={arrowBtn} onClick={() => shiftDate(1)} title="Jour suivant">›</button>
        </div>
      </div>

      {/* Ma réservation pour cette date */}
      {myBookingForDate && (
        <button
          onClick={() => setActiveTab('my-bookings')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            marginBottom: '16px',
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ flex: 1, fontSize: '14px', color: '#15803d' }}>
            <strong>Place {myBookingForDate.spot?.number ?? '—'}</strong> réservée
            {date === todayIso() ? " aujourd'hui" : ' ce jour'} · {myBookingForDate.startTime}–{myBookingForDate.endTime}
          </span>
          <span style={{ fontSize: '12px', color: '#15803d', opacity: 0.8, whiteSpace: 'nowrap' }}>Gérer ›</span>
        </button>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size={36} />
        </div>
      ) : visibleSpots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🅿️</div>
          <p style={{ margin: 0, fontWeight: 600 }}>Aucune place disponible</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Toutes les places sont réservées pour cette date.</p>
        </div>
      ) : (
        TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => (
          <div key={type} style={{ marginBottom: '28px' }}>
            {/* Section header with divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}>
                {TYPE_LABELS[type]}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{
                fontSize: '11px', color: 'var(--color-text-muted)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 8px',
                whiteSpace: 'nowrap',
              }}>
                {grouped[type].filter(s => s.status === 'FREE').length} libre{grouped[type].filter(s => s.status === 'FREE').length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
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
