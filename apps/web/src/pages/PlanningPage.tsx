import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import { Spinner } from '../components/Spinner';
import { AdminBookingModal } from '../components/AdminBookingModal';
import type { Spot, BookingWithSpot, User } from '../types/api.types';

/* ─── Types ────────────────────────────────────────────────────────────────── */
type ViewMode = 'W5' | 'W7' | 'MONTH';

/* ─── date helpers ─────────────────────────────────────────────────────────── */
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function getDays(viewMode: ViewMode, periodStart: Date): Date[] {
  if (viewMode === 'W5') return Array.from({ length: 5 }, (_, i) => addDays(periodStart, i));
  if (viewMode === 'W7') return Array.from({ length: 7 }, (_, i) => addDays(periodStart, i));
  // MONTH — tous les jours du mois
  const y = periodStart.getFullYear();
  const m = periodStart.getMonth();
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
}
function getPeriodLabel(viewMode: ViewMode, days: Date[]): string {
  if (!days.length) return '';
  if (viewMode === 'MONTH') {
    const s = days[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `${days[0].getDate()} – ${days[days.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
/** 0 = Lundi … 6 = Dimanche */
function dowIndex(d: Date) { return (d.getDay() + 6) % 7; }

/* ─── constants ────────────────────────────────────────────────────────────── */
const DAY_FR    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_SHORT = ['L',   'M',   'M',   'J',   'V',   'S',   'D'  ];
const TYPE_ORDER  = ['LOT1', 'LOT2', 'BOX'];
const TYPE_LABELS: Record<string, string> = {
  LOT1: 'Chêne-Bourg Lot 1',
  LOT2: 'Chêne-Bourg Lot 2',
  BOX:  'Chêne-Bourg Box',
};

/* ─── cell helpers ─────────────────────────────────────────────────────────── */
type CellStatus = 'free' | 'reserved' | 'occupied' | 'released' | 'blocked' | 'indefinite';

const CELL: Record<CellStatus, { bg: string; text: string; label: string }> = {
  free:       { bg: 'var(--status-free-bg)',     text: 'var(--status-free-fg)',     label: 'Libre'                 },
  reserved:   { bg: 'var(--status-reserved-bg)', text: 'var(--status-reserved-fg)', label: 'Réservé'               },
  occupied:   { bg: 'var(--status-occupied-bg)', text: 'var(--status-occupied-fg)', label: 'Occupé'                },
  released:   { bg: 'var(--color-surface-3)',    text: 'var(--color-text-subtle)',  label: 'Libéré'                },
  blocked:    { bg: 'var(--status-blocked-bg)',  text: 'var(--status-blocked-fg)',  label: 'Bloqué'                },
  indefinite: { bg: 'var(--status-offslot-bg)',  text: 'var(--status-offslot-fg)',  label: "Jusqu'à nouvel ordre"  },
};

function findBooking(spotId: string, dateStr: string, bookings: BookingWithSpot[]): BookingWithSpot | null {
  return bookings.find(b =>
    b.spotId === spotId &&
    b.status !== 'CANCELLED' &&
    (b.date === dateStr || (b.isIndefinite === true && b.date <= dateStr)),
  ) ?? null;
}

function cellStatus(spot: Spot, dateStr: string, bookings: BookingWithSpot[]): CellStatus {
  if (spot.status === 'BLOCKED') return 'blocked';
  const b = findBooking(spot.id, dateStr, bookings);
  if (!b) return 'free';
  if (b.isIndefinite) return 'indefinite';
  if (b.status === 'OCCUPIED') return 'occupied';
  if (b.status === 'RELEASED') return 'released';
  return 'reserved';
}

function getCellLabel(booking: BookingWithSpot): string {
  // Véhicule → toujours prioritaire
  if (booking.vehicleLabel) return booking.vehicleLabel;
  // Lié à un conducteur → trigramme ou nom
  const user = booking.user as { name?: string; trigram?: string | null } | undefined;
  if (user?.trigram) return user.trigram;
  const name = user?.name;
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  }
  // Pas de conducteur ni véhicule → note admin ou label générique
  return booking.adminNote ?? (booking.isIndefinite ? 'Bloqué' : '–');
}

function getCellInitial(booking: BookingWithSpot): string {
  if (booking.vehicleLabel) return booking.vehicleLabel.charAt(0).toUpperCase();
  const user = booking.user as { name?: string; trigram?: string | null } | undefined;
  if (user?.trigram) return user.trigram.charAt(0).toUpperCase();
  const name = user?.name;
  return name ? name.charAt(0).toUpperCase() : '•';
}

function getTooltip(booking: BookingWithSpot, status: string): string {
  const who   = booking.vehicleLabel ?? (booking.user as { name?: string } | undefined)?.name ?? '—';
  const times = booking.isIndefinite ? `${booking.startTime} → ∞` : `${booking.startTime ?? ''}–${booking.endTime ?? ''}`;
  const src   = booking.source === 'ADMIN' ? ' · Admin' : ' · Utilisateur';
  const note  = booking.adminNote ? ` · ${booking.adminNote}` : '';
  return `${who} · ${times}${src}${note}`;
}

/* ─── component ────────────────────────────────────────────────────────────── */
export function PlanningPage() {
  const [viewMode,    setViewMode]    = useState<ViewMode>('W5');
  const [periodStart, setPeriodStart] = useState(() => getMonday(new Date()));
  const [spots,       setSpots]       = useState<Spot[]>([]);
  const [bookings,    setBookings]    = useState<BookingWithSpot[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [createCell,  setCreateCell]  = useState<{ spot: Spot; date: string } | null>(null);
  const [editBooking, setEditBooking] = useState<BookingWithSpot | null>(null);
  const { addToast } = useUiStore();

  const days     = useMemo(() => getDays(viewMode, periodStart), [viewMode, periodStart]);
  const todayStr = toIso(new Date());
  const isMonth  = viewMode === 'MONTH';

  /* ── data ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = toIso(days[0]);
      const to   = toIso(days[days.length - 1]);
      const [sp, bk, us] = await Promise.all([
        api.getSpots(),
        api.getAllBookings(from, to),
        api.getUsers(),
      ]);
      setSpots(sp);
      setBookings(bk);
      setUsers(us);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [days, addToast]);

  useEffect(() => { void load(); }, [load]);

  /* ── navigation ── */
  function navigate(dir: -1 | 1) {
    if (isMonth) {
      setPeriodStart(p => new Date(p.getFullYear(), p.getMonth() + dir, 1));
    } else {
      setPeriodStart(p => addDays(p, dir * 7));
    }
  }

  function goToToday() {
    const t = new Date();
    setPeriodStart(isMonth ? new Date(t.getFullYear(), t.getMonth(), 1) : getMonday(t));
  }

  function switchView(mode: ViewMode) {
    if (mode === viewMode) return;
    if (mode === 'MONTH') {
      setPeriodStart(new Date(days[0].getFullYear(), days[0].getMonth(), 1));
    } else {
      setPeriodStart(getMonday(days[0]));
    }
    setViewMode(mode);
  }

  /* ── grouping ── */
  const grouped = TYPE_ORDER.reduce<Record<string, Spot[]>>(
    (acc, t) => { acc[t] = spots.filter(s => s.type === t); return acc; },
    {},
  );

  /* ── shared styles ── */
  const th: React.CSSProperties = {
    padding: '10px 6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    fontSize: 'var(--fs-sm)', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap',
    color: 'var(--color-text-subtle)',
  };
  const tdBase: React.CSSProperties = {
    padding: '10px 6px', border: '1px solid var(--color-border)',
    verticalAlign: 'middle', fontSize: 'var(--fs-base)',
  };

  const modalOpen  = !!createCell || !!editBooking;
  const modalSpot  = editBooking ? spots.find(s => s.id === editBooking.spotId) ?? null : createCell?.spot ?? null;
  const modalDate  = editBooking ? editBooking.date : createCell?.date;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page__header">
        <div>
          <h1 className="page__title">Planning</h1>
          <p className="page__subtitle">Occupation des places jour par jour. Cliquez sur une case pour réserver ou modifier.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>

          {/* View toggle */}
          <div className="segmented">
            {(['W5', 'W7', 'MONTH'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => switchView(mode)}
                className={viewMode === mode ? 'is-active' : ''}
              >
                {mode === 'W5' ? '5 jours' : mode === 'W7' ? '7 jours' : 'Mois'}
              </button>
            ))}
          </div>

          {/* Today */}
          <button className="btn btn--ghost btn--sm" onClick={goToToday}>
            Aujourd'hui
          </button>

          {/* Nav arrows + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Période précédente">‹</button>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, textAlign: 'center', minWidth: isMonth ? '140px' : '200px' }}>
              {getPeriodLabel(viewMode, days)}
            </span>
            <button className="icon-btn" onClick={() => navigate(1)} aria-label="Période suivante">›</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={36} /></div>
      ) : (
        <>
          {/* ── Grid ── */}
          <div className="card">
          <div className="table-wrap" style={{ borderRadius: 'var(--radius-lg)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: isMonth ? undefined : '520px' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '76px', minWidth: '76px', textAlign: 'left', paddingLeft: '12px' }}>Place</th>
                  {days.map(d => {
                    const iso      = toIso(d);
                    const isToday  = iso === todayStr;
                    const dow      = dowIndex(d);
                    const isWeekend = dow >= 5;

                    return (
                      <th
                        key={iso}
                        style={{
                          ...th,
                          minWidth: isMonth ? '40px' : '100px',
                          width:    isMonth ? '40px' : undefined,
                          padding:  isMonth ? '6px 2px' : '10px 6px',
                          background: isToday
                            ? 'var(--accent-050)'
                            : isWeekend && isMonth ? 'var(--color-surface-3)'
                            : 'var(--color-surface-2)',
                          color: isToday
                            ? 'var(--accent)'
                            : isWeekend ? 'var(--color-text-subtle)'
                            : 'var(--color-text)',
                        }}
                      >
                        {isMonth ? (
                          <>
                            <div style={{ fontSize: '10px', opacity: 0.65 }}>{DAY_SHORT[dow]}</div>
                            <div style={{ fontSize: '15px', fontWeight: 800 }}>{d.getDate()}</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>{DAY_FR[dow]}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800 }}>{d.getDate()}</div>
                          </>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {TYPE_ORDER.filter(t => grouped[t]?.length).map(type => (
                <tbody key={type}>
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      style={{
                        background: 'var(--color-surface-2)',
                        padding: isMonth ? '4px 12px' : '6px 14px',
                        fontSize: '12px', fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        borderTop: '2px solid var(--color-border)',
                      }}
                    >
                      {TYPE_LABELS[type]}
                    </td>
                  </tr>

                  {grouped[type].map(spot => (
                    <tr key={spot.id}>
                      <td style={{ ...tdBase, fontWeight: 700, paddingLeft: '12px', background: 'var(--color-surface)', fontSize: isMonth ? '13px' : '15px', whiteSpace: 'nowrap' }}>
                        {spot.number}
                      </td>

                      {days.map(d => {
                        const iso       = toIso(d);
                        const status    = cellStatus(spot, iso, bookings);
                        const booking   = findBooking(spot.id, iso, bookings);
                        const c         = CELL[status];
                        const isAdmin   = booking?.source === 'ADMIN';
                        const isWeekend = dowIndex(d) >= 5;

                        return (
                          <td
                            key={iso}
                            onClick={() => booking ? setEditBooking(booking) : setCreateCell({ spot, date: iso })}
                            title={booking ? getTooltip(booking, status) : `Cliquer pour réserver — ${c.label}`}
                            style={{
                              ...tdBase,
                              position: 'relative',
                              background: c.bg,
                              cursor: 'pointer',
                              textAlign: 'center',
                              padding: isMonth ? '5px 2px' : '10px 6px',
                              borderLeft: isAdmin ? `${isMonth ? 2 : 3}px solid var(--status-reserved-fg)` : undefined,
                              opacity: isWeekend && status === 'free' ? 0.5 : 1,
                              transition: 'filter 0.1s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.85)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
                          >

                            {isMonth ? (
                              /* Month view — initial seulement */
                              booking ? (
                                <div style={{ fontSize: '11px', color: c.text, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {getCellInitial(booking)}
                                </div>
                              ) : null
                            ) : (
                              /* Week view — label complet */
                              booking ? (
                                <div style={{
                                  fontSize: '12px', color: c.text, fontWeight: 600,
                                  lineHeight: 1.3, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  maxWidth: '88px', margin: '0 auto',
                                }}>
                                  {getCellLabel(booking)}
                                </div>
                              ) : (
                                <div style={{ fontSize: '13px', color: c.text, opacity: 0.5 }}>+</div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          </div>

          {/* ── Légende ── */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
            {(Object.entries(CELL) as [CellStatus, typeof CELL[CellStatus]][]).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)' }}>
                <span style={{ width: '20px', height: '14px', borderRadius: '5px', background: val.bg, border: '1px solid var(--color-border)', display: 'inline-block', flexShrink: 0 }} />
                {val.label}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)' }}>
              <span style={{ width: '20px', height: '14px', borderRadius: '5px', background: 'var(--status-reserved-bg)', display: 'inline-block', flexShrink: 0, borderLeft: '3px solid var(--status-reserved-fg)' }} />
              Admin
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Cliquez sur une case pour réserver ou modifier
            </div>
          </div>
        </>
      )}

      {/* ── Admin booking modal ── */}
      <AdminBookingModal
        open={modalOpen}
        spot={createCell ? createCell.spot : modalSpot}
        date={modalDate}
        booking={editBooking}
        spots={spots}
        users={users}
        onClose={() => { setCreateCell(null); setEditBooking(null); }}
        onSaved={() => { setCreateCell(null); setEditBooking(null); void load(); }}
      />
    </div>
  );
}
