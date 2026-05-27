import { useState } from 'react';
import type { Spot } from '../types/api.types';

const STATUS_COLORS: Record<string, string> = {
  FREE: 'var(--color-free)',
  HELD: 'var(--color-reserved)',
  RESERVED: 'var(--color-reserved)',
  OCCUPIED: 'var(--color-occupied)',
  BLOCKED: 'var(--color-blocked)',
  RELEASED: 'var(--color-free)',
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
  const color = STATUS_COLORS[spot.status] ?? '#6b7280';
  const isClickable = spot.status === 'FREE' && !!onClick;

  const elevated = selected || (isClickable && hovered);

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface)',
        border: `2px solid ${selected ? 'var(--color-primary)' : color}`,
        borderRadius: '10px',
        padding: '12px',
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: elevated ? 'translateY(-2px) scale(1.01)' : 'scale(1)',
        boxShadow: selected
          ? 'var(--shadow-md)'
          : hovered && isClickable
            ? 'var(--shadow-md)'
            : 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
            {spot.number}
          </div>
          {spot.label && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {spot.label}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 'var(--radius-full)',
          background: `${color}22`,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {STATUS_LABELS[spot.status] ?? spot.status}
        </span>
      </div>
    </button>
  );
}
