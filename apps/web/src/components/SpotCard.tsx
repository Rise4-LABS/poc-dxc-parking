import { useState } from 'react';
import type { Spot } from '../types/api.types';

const STATUS_TOKENS: Record<string, { fg: string; bg: string }> = {
  FREE:     { fg: 'var(--status-free-fg)',     bg: 'var(--status-free-bg)' },
  HELD:     { fg: 'var(--status-reserved-fg)', bg: 'var(--status-reserved-bg)' },
  RESERVED: { fg: 'var(--status-reserved-fg)', bg: 'var(--status-reserved-bg)' },
  OCCUPIED: { fg: 'var(--status-occupied-fg)', bg: 'var(--status-occupied-bg)' },
  BLOCKED:  { fg: 'var(--status-blocked-fg)',  bg: 'var(--status-blocked-bg)' },
  RELEASED: { fg: 'var(--status-free-fg)',     bg: 'var(--status-free-bg)' },
};

const STATUS_LABELS: Record<string, string> = {
  FREE: 'Libre',
  HELD: 'Retenu',
  RESERVED: 'Réservé',
  OCCUPIED: 'Occupé',
  BLOCKED: 'Bloqué',
  RELEASED: 'Libéré',
};

interface Props {
  spot: Spot;
  onClick?: () => void;
  selected?: boolean;
}

export function SpotCard({ spot, onClick, selected }: Props) {
  const [hovered, setHovered] = useState(false);
  const tokens = STATUS_TOKENS[spot.status] ?? { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-3)' };
  const isClickable = spot.status === 'FREE' && !!onClick;

  const elevated = selected || (isClickable && hovered);

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${selected ? 'var(--brand)' : 'var(--color-border)'}`,
        boxShadow: selected
          ? `var(--shadow-md), inset 0 0 0 1px var(--brand)`
          : elevated
            ? 'var(--shadow-md)'
            : 'var(--shadow-sm)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        transform: elevated ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Liseré de statut à gauche */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: tokens.fg, opacity: 0.9,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--color-text)', lineHeight: 1.1 }}>
            {spot.number}
          </div>
          {spot.label && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {spot.label}
            </div>
          )}
        </div>
        <span
          className="badge"
          style={{ background: tokens.bg, color: tokens.fg, flexShrink: 0 }}
        >
          {STATUS_LABELS[spot.status] ?? spot.status}
        </span>
      </div>
    </button>
  );
}
