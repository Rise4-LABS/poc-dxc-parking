import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { todayIso } from '../lib/dateUtils';
import type { BookingWithSpot } from '../types/api.types';

interface Props {
  booking: BookingWithSpot | null;   // null = fermé
  onClose: () => void;
  onSaved: () => void;
}

const TIME_SLOTS = [
  { label: 'Matin',       sublabel: '08h – 12h', start: '08:00', end: '12:00' },
  { label: 'Après-midi',  sublabel: '12h – 18h', start: '12:00', end: '18:00' },
  { label: 'Journée',     sublabel: '08h – 18h', start: '08:00', end: '18:00' },
  { label: 'Personnalisé', sublabel: 'Choisir les heures', start: '', end: '' },
];

function matchSlot(start: string, end: string): number {
  const idx = TIME_SLOTS.findIndex(s => s.start === start && s.end === end);
  return idx === -1 ? 3 : idx; // 3 = personnalisé
}

export function EditBookingModal({ booking, onClose, onSaved }: Props) {
  const { addToast } = useUiStore();

  const [date,      setDate]      = useState('');
  const [slotIdx,   setSlotIdx]   = useState(2);
  const [custStart, setCustStart] = useState('08:00');
  const [custEnd,   setCustEnd]   = useState('18:00');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  /* Pré-remplissage dès l'ouverture */
  useEffect(() => {
    if (!booking) return;
    setError('');
    setDate(booking.date);
    const idx = matchSlot(booking.startTime, booking.endTime ?? '');
    setSlotIdx(idx);
    if (idx === 3) {
      setCustStart(booking.startTime);
      setCustEnd(booking.endTime ?? '18:00');
    } else {
      setCustStart('08:00');
      setCustEnd('18:00');
    }
  }, [booking]);

  const isCustom = slotIdx === 3;
  const activeSlot = TIME_SLOTS[slotIdx];
  const startTime = isCustom ? custStart : activeSlot.start;
  const endTime   = isCustom ? custEnd   : activeSlot.end;

  async function handleSave() {
    if (!booking) return;
    setError('');
    if (!date) { setError('Veuillez choisir une date.'); return; }
    if (startTime >= endTime) { setError("L'heure de fin doit être après l'heure de début."); return; }

    setLoading(true);
    try {
      await api.updateBooking(booking.id, { date, startTime, endTime });
      addToast('Réservation modifiée ✓', 'success');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /* ── styles ── */
  const label: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '8px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--color-border)', borderRadius: '8px',
    fontSize: '14px', background: 'var(--color-surface)',
    color: 'var(--color-text)', boxSizing: 'border-box',
  };

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title={`Modifier — Place ${booking?.spot?.number ?? ''}`}
    >
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
          <label style={label}>Date</label>
          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={e => setDate(e.target.value)}
            onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
            style={inputStyle}
          />
        </div>

        {/* Créneau */}
        <div>
          <label style={label}>Créneau horaire</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlotIdx(i)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px', borderRadius: '8px', textAlign: 'left',
                  border: `2px solid ${slotIdx === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: slotIdx === i ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: slotIdx === i ? 'var(--color-primary)' : 'var(--color-text)',
                  fontSize: '14px', cursor: 'pointer',
                  fontWeight: slotIdx === i ? 600 : 400,
                }}
              >
                <span>{slot.label}</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{slot.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Heures personnalisées */}
        {isCustom && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={label}>Heure début</label>
              <input
                type="time"
                value={custStart}
                onChange={e => setCustStart(e.target.value)}
                onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label}>Heure fin</label>
              <input
                type="time"
                value={custEnd}
                onChange={e => setCustEnd(e.target.value)}
                onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Résumé */}
        {date && startTime && endTime && (
          <div style={{
            padding: '10px 14px', background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--color-text-muted)',
          }}>
            📅 <strong style={{ color: 'var(--color-text)' }}>
              {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </strong>
            {' · '}{startTime} – {endTime}
          </div>
        )}

        {/* Bouton */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading}
          style={{
            padding: '14px',
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? <><Spinner size={18} /> Enregistrement…</> : '✏️ Enregistrer les modifications'}
        </button>

      </div>
    </Modal>
  );
}
