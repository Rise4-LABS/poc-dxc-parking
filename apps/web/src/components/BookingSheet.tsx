import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import type { Spot } from '../types/api.types';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { todayIso } from '../lib/dateUtils';

interface Props {
  spot: Spot | null;
  /** Date sélectionnée dans la grille — pré-remplit le formulaire */
  date?: string;
  onClose: () => void;
  onBooked: () => void;
}

const TIME_SLOTS = [
  { label: 'Journée',    sublabel: '08h – 18h', start: '08:00', end: '18:00' },
  { label: 'Matin',      sublabel: '08h – 12h', start: '08:00', end: '12:00' },
  { label: 'Après-midi', sublabel: '12h – 18h', start: '12:00', end: '18:00' },
];

export function BookingSheet({ spot, date: gridDate, onClose, onBooked }: Props) {
  const [date,        setDate]        = useState(todayIso());
  const [slotIdx,     setSlotIdx]     = useState(0);           // Journée par défaut
  const [startTime,   setStartTime]   = useState('08:00');
  const [endTime,     setEndTime]     = useState('18:00');
  const [repeat,      setRepeat]      = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const { addToast } = useUiStore();

  // À l'ouverture, reprend la date sélectionnée dans la grille
  useEffect(() => {
    if (spot) {
      setDate(gridDate && gridDate >= todayIso() ? gridDate : todayIso());
      setRepeat(false);
      setRepeatUntil('');
      setError('');
    }
  }, [spot, gridDate]);

  function selectSlot(i: number) {
    setSlotIdx(i);
    setStartTime(TIME_SLOTS[i].start);
    setEndTime(TIME_SLOTS[i].end);
  }

  async function handleBook() {
    if (!spot) return;
    setError('');
    if (startTime >= endTime) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    if (repeat && (!repeatUntil || repeatUntil <= date)) {
      setError('Choisissez une date de fin de récurrence après la date de début.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.createBooking({
        spotId: spot.id, date, startTime, endTime,
        ...(repeat && repeatUntil ? { repeatWeeklyUntil: repeatUntil } : {}),
      });
      if ('bookings' in result) {
        const n = result.bookings.length;
        addToast(`Place ${spot.number} réservée — ${n} date${n > 1 ? 's' : ''} !`, 'success');
        if (result.skipped.length) {
          addToast(`${result.skipped.length} date(s) déjà prise(s), non réservée(s)`, 'info');
        }
      } else {
        addToast(`Place ${spot.number} réservée !`, 'success');
      }
      navigator.vibrate?.([50, 30, 50]);
      onBooked();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ── styles ── */
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '8px',
  };
  const timeInput: React.CSSProperties = {
    width: '100%', padding: '11px 12px',
    border: '1px solid var(--color-border)', borderRadius: '8px',
    fontSize: '16px', background: 'var(--color-surface)',
    color: 'var(--color-text)', boxSizing: 'border-box',
    textAlign: 'center',
  };

  return (
    <Modal open={!!spot} onClose={onClose} title={`Réserver la place ${spot?.number ?? ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Erreur */}
        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: '8px',
            color: '#dc2626', fontSize: '13px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={e => setDate(e.target.value)}
            onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
            style={{
              width: '100%', padding: '11px 14px',
              border: '1px solid var(--color-border)', borderRadius: '8px',
              fontSize: '15px', background: 'var(--color-surface)',
              color: 'var(--color-text)', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Créneaux */}
        <div>
          <label style={labelStyle}>Créneau</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSlot(i)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  padding: '10px 8px', borderRadius: '8px',
                  border: `2px solid ${slotIdx === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: slotIdx === i ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: slotIdx === i ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: slotIdx === i ? 700 : 500 }}>
                  {slot.label}
                </span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>{slot.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Heures début / fin */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Heure de début</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={timeInput}
            />
          </div>
          <div>
            <label style={labelStyle}>Heure de fin</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={timeInput}
            />
          </div>
        </div>

        {/* Récurrence hebdo */}
        <div>
          <button
            type="button"
            onClick={() => setRepeat(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '11px 14px', boxSizing: 'border-box',
              borderRadius: '8px',
              border: `2px solid ${repeat ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: repeat ? 'var(--color-primary-light)' : 'var(--color-surface)',
              color: repeat ? 'var(--color-primary)' : 'var(--color-text)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '16px' }}>🔁</span>
            Répéter chaque semaine
            <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.7 }}>{repeat ? 'Oui' : 'Non'}</span>
          </button>
          {repeat && (
            <div style={{ marginTop: '10px' }}>
              <label style={labelStyle}>Jusqu'au (12 semaines max)</label>
              <input
                type="date"
                value={repeatUntil}
                min={date}
                onChange={e => setRepeatUntil(e.target.value)}
                onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--color-border)', borderRadius: '8px',
                  fontSize: '15px', background: 'var(--color-surface)',
                  color: 'var(--color-text)', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Même jour de la semaine, même créneau. Les dates déjà prises seront ignorées.
              </div>
            </div>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={() => void handleBook()}
          disabled={loading}
          style={{
            padding: '14px', background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? <><Spinner size={18} /> Réservation…</> : 'Confirmer la réservation'}
        </button>

      </div>
    </Modal>
  );
}
