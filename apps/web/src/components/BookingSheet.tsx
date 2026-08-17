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

  return (
    <Modal open={!!spot} onClose={onClose} title={`Réserver la place ${spot?.number ?? ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Erreur */}
        {error && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)', background: 'var(--status-occupied-bg)',
            border: '1px solid var(--status-occupied-fg)', borderRadius: 'var(--radius-md)',
            color: 'var(--status-occupied-fg)', fontSize: 'var(--fs-sm)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Date */}
        <div className="field">
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            min={todayIso()}
            onChange={e => setDate(e.target.value)}
            onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
          />
        </div>

        {/* Créneaux */}
        <div className="field">
          <label className="label">Créneau</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSlot(i)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  padding: 'var(--space-3) var(--space-2)', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${slotIdx === i ? 'var(--brand)' : 'var(--color-border-strong)'}`,
                  background: slotIdx === i ? 'var(--brand-050)' : 'var(--color-surface)',
                  color: slotIdx === i ? 'var(--brand)' : 'var(--color-text)',
                  boxShadow: slotIdx === i ? 'inset 0 0 0 1px var(--brand)' : 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: slotIdx === i ? 700 : 500 }}>
                  {slot.label}
                </span>
                <span style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>{slot.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Heures début / fin */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="field">
            <label className="label">Heure de début</label>
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={{ textAlign: 'center' }}
            />
          </div>
          <div className="field">
            <label className="label">Heure de fin</label>
            <input
              className="input"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={{ textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Récurrence hebdo */}
        <div>
          <button
            type="button"
            onClick={() => setRepeat(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              width: '100%', padding: 'var(--space-3) var(--space-4)', boxSizing: 'border-box',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${repeat ? 'var(--brand)' : 'var(--color-border-strong)'}`,
              background: repeat ? 'var(--brand-050)' : 'var(--color-surface)',
              color: repeat ? 'var(--brand)' : 'var(--color-text)',
              boxShadow: repeat ? 'inset 0 0 0 1px var(--brand)' : 'none',
              fontSize: 'var(--fs-base)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '16px' }}>🔁</span>
            Répéter chaque semaine
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-sm)', opacity: 0.7 }}>{repeat ? 'Oui' : 'Non'}</span>
          </button>
          {repeat && (
            <div className="field" style={{ marginTop: 'var(--space-3)' }}>
              <label className="label">Jusqu'au (12 semaines max)</label>
              <input
                className="input"
                type="date"
                value={repeatUntil}
                min={date}
                onChange={e => setRepeatUntil(e.target.value)}
                onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
              />
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Même jour de la semaine, même créneau. Les dates déjà prises seront ignorées.
              </div>
            </div>
          )}
        </div>

        {/* Bouton */}
        <button
          className="btn btn--primary btn--block"
          onClick={() => void handleBook()}
          disabled={loading}
          style={{ padding: 'var(--space-4)', fontSize: 'var(--fs-md)' }}
        >
          {loading ? <><Spinner size={18} /> Réservation…</> : 'Confirmer la réservation'}
        </button>

      </div>
    </Modal>
  );
}
