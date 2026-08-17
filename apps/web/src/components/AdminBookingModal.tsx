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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit
        ? `Édition — Place ${booking?.spot?.number ?? spots.find(s => s.id === spotId)?.number ?? ''}`
        : 'Nouvelle réservation admin'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--status-occupied-bg)', border: '1px solid var(--status-occupied-fg)', borderRadius: 'var(--radius-md)', color: 'var(--status-occupied-fg)', fontSize: 'var(--fs-sm)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Place ── */}
        <div className="field">
          <label className="label">Place de parking</label>
          <select className="select" value={spotId} onChange={e => setSpotId(e.target.value)} disabled={!!spot && !isEdit}>
            {spots.map(s => (
              <option key={s.id} value={s.id}>{s.number} — {TYPE_LABELS[s.type] ?? s.type}</option>
            ))}
          </select>
        </div>

        {/* ── Occupant ── */}
        <div className="field">
          <label className="label">Occupant</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            {(['USER', 'VEHICLE'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setOccupantType(t)}
                className={`chip${occupantType === t ? ' is-active' : ''}`}
                style={{ textAlign: 'center' }}
              >
                {t === 'USER' ? '👤 Utilisateur' : '🚗 Véhicule'}
              </button>
            ))}
          </div>
          {occupantType === 'USER' ? (
            <select className="select" value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">— Sélectionner un utilisateur —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.accessId})</option>)}
            </select>
          ) : (
            <input
              className="input"
              type="text"
              value={vehicleLabel}
              onChange={e => setVehicleLabel(e.target.value)}
              placeholder="Ex : Tesla Model 3, Renault ZOE…"
            />
          )}
        </div>

        {/* ── Type de réservation ── */}
        <div className="field">
          <label className="label">Type de réservation</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            {([
              { key: 'TIMED'      as BookingMode, icon: '📅', title: 'Date & heures',  sub: 'Plage de dates et horaires' },
              { key: 'INDEFINITE' as BookingMode, icon: '♾️', title: 'Indéfini',        sub: "Jusqu'à nouvel ordre"       },
            ]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`chip${mode === opt.key ? ' is-active' : ''}`}
                style={{ padding: '12px 10px', textAlign: 'center', lineHeight: 1.4, display: 'block' }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
                <div>{opt.title}</div>
                <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.7, fontWeight: 400, marginTop: '2px' }}>{opt.sub}</div>
              </button>
            ))}
          </div>

          {/* ── Champs TIMED ── */}
          {mode === 'TIMED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div className="field">
                  <label className="label">Date début</label>
                  <input
                    className="input"
                    type="date"
                    value={startDate}
                    onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                    }}
                  />
                </div>
                <div className="field">
                  <label className="label">Date fin</label>
                  <input
                    className="input"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div className="field">
                  <label className="label">Heure début</label>
                  <input className="input" type="time" value={startTime} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Heure fin</label>
                  <input className="input" type="time" value={endTime} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Champs INDEFINITE ── */}
          {mode === 'INDEFINITE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="field">
                <label className="label">Date de début</label>
                <input className="input" type="date" value={startDate} onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--status-reserved-bg)', border: '1px solid var(--status-reserved-fg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)', color: 'var(--status-reserved-fg)' }}>
                🔒 La place sera bloquée à partir de cette date jusqu'à suppression manuelle de cette réservation.
              </div>
            </div>
          )}
        </div>

        {/* ── Note ── */}
        <div className="field">
          <label className="label">Note (optionnel)</label>
          <textarea
            className="textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Raison, véhicule de prêt, contexte…"
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* ── Footer ── */}
        {deleteConfirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'center', fontSize: 'var(--fs-base)', padding: '6px 0', color: 'var(--color-text)' }}>
              Supprimer définitivement cette réservation&nbsp;?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setDeleteConfirm(false)}>
                Non, revenir
              </button>
              <button type="button" className="btn btn--danger" onClick={() => void handleDelete()} disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--primary btn--block" onClick={() => void handleSubmit()} disabled={loading} style={{ padding: '13px' }}>
              {loading ? <Spinner size={18} /> : isEdit ? '✏️ Modifier' : '✅ Confirmer la réservation'}
            </button>
            {isEdit && (
              <button type="button" className="btn btn--danger btn--block" onClick={() => setDeleteConfirm(true)}>
                🗑 Supprimer cette réservation
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
