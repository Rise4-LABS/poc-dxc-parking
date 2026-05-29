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
  free:       { bg: '#16a34a', text: '#fff',    label: 'Libre'                 },
  reserved:   { bg: '#f59e0b', text: '#fff',    label: 'Réservé'               },
  occupied:   { bg: '#dc2626', text: '#fff',    label: 'Occupé'                },
  released:   { bg: '#9ca3af', text: '#fff',    label: 'Libéré'                },
  blocked:    { bg: '#374151', text: '#d1d5db', label: 'Bloqué'                },
  indefinite: { bg: '#1e293b', text: '#94a3b8', label: "Jusqu'à nouvel ordre"  },
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
  if (booking.isIndefinite) return booking.vehicleLabel ?? booking.adminNote ?? 'Bloqué';
  if (booking.vehicleLabel) return booking.vehicleLabel;
  const name = (booking.user as { name?: string } | undefined)?.name;
  if (!name) return booking.adminNote ?? '–';
  const parts = name.trim().split(' ');
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

function getCellInitial(booking: BookingWithSpot): string {
  const lbl = booking.vehicleLabel ?? (booking.user as { name?: string } | undefined)?.name;
  return lbl ? lbl.charAt(0).toUpperCase() : '•';
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
    fontSize: '13px', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap',
  };
  const tdBase: React.CSSProperties = {
    padding: '10px 6px', border: '1px solid var(--color-border)',
    verticalAlign: 'middle', fontSize: '14px',
  };
  const navBtn: React.CSSProperties = {
    border: '1px solid var(--color-border)', borderRadius: '8px',
    background: 'var(--color-surface)', padding: '6px 14px',
    cursor: 'pointer', fontSize: '18px', lineHeight: 1,
  };

  const modalOpen  = !!createCell || !!editBooking;
  const modalSpot  = editBooking ? spots.find(s => s.id === editBooking.spotId) ?? null : createCell?.spot ?? null;
  const modalDate  = editBooking ? editBooking.date : createCell?.date;

  return (
    <div style={{ padding: '16px' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Planning</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {(['W5', 'W7', 'MONTH'] as ViewMode[]).map((mode, i, arr) => (
              <button
                key={mode}
                onClick={() => switchView(mode)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: viewMode === mode ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: viewMode === mode ? '#fff' : 'var(--color-text)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {mode === 'W5' ? '5 jours' : mode === 'W7' ? '7 jours' : 'Mois'}
              </button>
            ))}
          </div>

          {/* Today */}
          <button
            onClick={goToToday}
            style={{ ...navBtn, fontSize: '12px', fontWeight: 600, padding: '6px 12px' }}
          >
            Aujourd'hui
          </button>

          {/* Nav arrows + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => navigate(-1)} style={navBtn}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center', minWidth: isMonth ? '140px' : '200px' }}>
              {getPeriodLabel(viewMode, days)}
            </span>
            <button onClick={() => navigate(1)} style={navBtn}>›</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={36} /></div>
      ) : (
        <>
          {/* ── Grid ── */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
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
                            ? '#eff6ff'
                            : isWeekend && isMonth ? '#f3f4f6'
                            : 'var(--color-surface-2)',
                          color: isToday
                            ? 'var(--color-primary)'
                            : isWeekend ? '#9ca3af'
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
                        const isToday   = iso === todayStr;
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
                              boxShadow: isToday ? 'inset 0 0 0 2px #1d4ed8' : undefined,
                              borderLeft: isAdmin ? `${isMonth ? 2 : 3}px solid #f59e0b` : undefined,
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

          {/* ── Légende ── */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(Object.entries(CELL) as [CellStatus, typeof CELL[CellStatus]][]).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span style={{ width: '20px', height: '14px', borderRadius: '4px', background: val.bg, display: 'inline-block', flexShrink: 0 }} />
                {val.label}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
              <span style={{ width: '20px', height: '14px', borderRadius: '4px', background: '#f59e0b', display: 'inline-block', flexShrink: 0, borderLeft: '3px solid #b45309' }} />
              Admin
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
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
