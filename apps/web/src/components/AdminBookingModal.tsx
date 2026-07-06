import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import type { Spot, BookingWithSpot, User } from '../types/api.types';

const TYPE_LABELS: Record<string, string> = {
  LOT1: 'Chêne-Bourg Lot 1',
  LOT2: 'Chêne-Bourg Lot 2',
  BOX:  'Chêne-Bourg Box',
};

type BookingMode = 'TIMED' | 'INDEFINITE';

interface Props {
  open: boolean;
  spot?: Spot | null;
  date?: string;
  booking?: BookingWithSpot | null;
  spots: Spot[];
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}

export function AdminBookingModal({ open, spot, date, booking, spots, users, onClose, onSaved }: Props) {
  const isEdit = !!booking;
  const { addToast } = useUiStore();

  /* ── form state ── */
  const [spotId,        setSpotId]        = useState('');
  const [mode,          setMode]          = useState<BookingMode>('TIMED');
  const [occupantType,  setOccupantType]  = useState<'USER' | 'VEHICLE'>('USER');
  const [userId,        setUserId]        = useState('');
  const [vehicleLabel,  setVehicleLabel]  = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [startTime,     setStartTime]     = useState('07:00');
  const [endTime,       setEndTime]       = useState('20:00');
  const [note,          setNote]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error,         setError]         = useState('');

  /* ── pre-fill ── */
  useEffect(() => {
    if (!open) return;
    setError('');
    setDeleteConfirm(false);
    setLoading(false);

    if (booking) {
      setSpotId(booking.spotId);
      setMode(booking.isIndefinite ? 'INDEFINITE' : 'TIMED');
      setOccupantType(booking.vehicleLabel ? 'VEHICLE' : 'USER');
      setUserId(booking.userId ?? '');
      setVehicleLabel(booking.vehicleLabel ?? '');
      setStartDate(booking.date);
      setEndDate(booking.date);
      setStartTime(booking.startTime ?? '07:00');
      setEndTime(booking.endTime ?? '20:00');
      setNote(booking.adminNote ?? '');
    } else {
      setSpotId(spot?.id ?? spots[0]?.id ?? '');
      setMode('TIMED');
      setOccupantType('USER');
      setUserId(users[0]?.id ?? '');
      setVehicleLabel('');
      setStartDate(date ?? '');
      setEndDate(date ?? '');
      setStartTime('07:00');
      setEndTime('20:00');
      setNote('');
    }
  }, [open, booking, spot, date, spots, users]);

  /* ── submit ── */
  async function handleSubmit() {
    if (!spotId)                                              { setError('Sélectionnez une place.');          return; }
    if (occupantType === 'USER'    && !userId)               { setError('Sélectionnez un utilisateur.');     return; }
    if (occupantType === 'VEHICLE' && !vehicleLabel.trim())  { setError('Saisissez le nom du véhicule.');    return; }
    if (!startDate)                                          { setError('Sélectionnez une date de début.');  return; }
    if (mode === 'TIMED' && !startTime)                      { setError('Saisissez une heure de début.');    return; }
    if (mode === 'TIMED' && !endTime)                        { setError('Saisissez une heure de fin.');      return; }
    if (mode === 'TIMED' && endDate && endDate < startDate)  { setError('La date de fin doit être ≥ date de début.'); return; }
    if (mode === 'TIMED' && startDate === (endDate || startDate) && endTime <= startTime) {
      setError("L'heure de fin doit être après l'heure de début."); return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        spotId,
        startDate,
        endDate:      mode === 'TIMED'      ? (endDate || startDate) : undefined,
        startTime:    mode === 'TIMED'      ? startTime              : '07:00',
        endTime:      mode === 'TIMED'      ? endTime                : null,
        userId:       occupantType === 'USER'    ? userId              : undefined,
        vehicleLabel: occupantType === 'VEHICLE' ? vehicleLabel.trim() : undefined,
        isIndefinite: mode === 'INDEFINITE',
        adminNote:    note.trim() || undefined,
      };

      if (isEdit && booking) {
        // Le PATCH admin mappe le champ `date` (pas startDate) → on le fournit explicitement,
        // sinon le changement de date est ignoré en silence.
        await api.adminUpdateBooking(booking.id, { ...payload, date: startDate });
        addToast('Réservation modifiée', 'success');
      } else {
        await api.adminCreateBooking(payload);
        addToast('Réservation créée', 'success');
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /* ── delete ── */
  async function handleDelete() {
    if (!booking) return;
    setLoading(true);
    try {
      await api.adminDeleteBooking(booking.id);
      addToast('Réservation supprimée', 'success');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  /* ── styles ── */
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px', display: 'block',
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--color-surface)',
    color: 'var(--color-text)', boxSizing: 'border-box',
  };
  const section: React.CSSProperties = { marginBottom: '20px' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit
        ? `Édition — Place ${booking?.spot?.number ?? spots.find(s => s.id === spotId)?.number ?? ''}`
        : 'Nouvelle réservation admin'}
    >
      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Place ── */}
      <div style={section}>
        <label style={labelStyle}>Place de parking</label>
        <select value={spotId} onChange={e => setSpotId(e.target.value)} disabled={!!spot && !isEdit} style={input}>
          {spots.map(s => (
            <option key={s.id} value={s.id}>{s.number} — {TYPE_LABELS[s.type] ?? s.type}</option>
          ))}
        </select>
      </div>

      {/* ── Occupant ── */}
      <div style={section}>
        <label style={labelStyle}>Occupant</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {(['USER', 'VEHICLE'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setOccupantType(t)}
              style={{
                padding: '10px',
                border: `2px solid ${occupantType === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                background: occupantType === t ? '#eff6ff' : 'var(--color-surface)',
                color: occupantType === t ? 'var(--color-primary)' : 'var(--color-text)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t === 'USER' ? '👤 Utilisateur' : '🚗 Véhicule'}
            </button>
          ))}
        </div>
        {occupantType === 'USER' ? (
          <select value={userId} onChange={e => setUserId(e.target.value)} style={input}>
            <option value="">— Sélectionner un utilisateur —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.accessId})</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={vehicleLabel}
            onChange={e => setVehicleLabel(e.target.value)}
            placeholder="Ex : Tesla Model 3, Renault ZOE…"
            style={input}
          />
        )}
      </div>

      {/* ── Type de réservation ── */}
      <div style={section}>
        <label style={labelStyle}>Type de réservation</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {([
            { key: 'TIMED'      as BookingMode, icon: '📅', title: 'Date & heures',  sub: 'Plage de dates et horaires' },
            { key: 'INDEFINITE' as BookingMode, icon: '♾️', title: 'Indéfini',        sub: "Jusqu'à nouvel ordre"       },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              style={{
                padding: '12px 10px', textAlign: 'center',
                border: `2px solid ${mode === opt.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                background: mode === opt.key ? '#eff6ff' : 'var(--color-surface)',
                color: mode === opt.key ? 'var(--color-primary)' : 'var(--color-text)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
              <div>{opt.title}</div>
              <div style={{ fontSize: '10px', opacity: 0.65, fontWeight: 400, marginTop: '2px' }}>{opt.sub}</div>
            </button>
          ))}
        </div>

        {/* ── Champs TIMED ── */}
        {mode === 'TIMED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Date début</label>
                <input
                  type="date"
                  value={startDate}
                  onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  style={input}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Date fin</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  onChange={e => setEndDate(e.target.value)}
                  style={input}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Heure début</label>
                <input type="time" value={startTime} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setStartTime(e.target.value)} style={input} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Heure fin</label>
                <input type="time" value={endTime} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setEndTime(e.target.value)} style={input} />
              </div>
            </div>
          </div>
        )}

        {/* ── Champs INDEFINITE ── */}
        {mode === 'INDEFINITE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Date de début</label>
              <input type="date" value={startDate} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setStartDate(e.target.value)} style={input} />
            </div>
            <div style={{ padding: '10px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', fontSize: '12px', color: '#854d0e' }}>
              🔒 La place sera bloquée à partir de cette date jusqu'à suppression manuelle de cette réservation.
            </div>
          </div>
        )}
      </div>

      {/* ── Note ── */}
      <div style={{ ...section, marginBottom: '24px' }}>
        <label style={labelStyle}>Note (optionnel)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Raison, véhicule de prêt, contexte…"
          rows={2}
          style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Footer ── */}
      {deleteConfirm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', fontSize: '14px', padding: '6px 0', color: 'var(--color-text)' }}>
            Supprimer définitivement cette réservation&nbsp;?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Non, revenir
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={loading}
              style={{ padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {loading ? <Spinner size={16} /> : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            style={{ padding: '14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? <Spinner size={18} /> : isEdit ? '✏️ Modifier' : '✅ Confirmer la réservation'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              style={{ padding: '11px', background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              🗑 Supprimer cette réservation
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
