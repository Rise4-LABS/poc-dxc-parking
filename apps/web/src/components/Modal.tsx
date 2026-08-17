import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.25s cubic-bezier(.16,1,.3,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 700 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: 'var(--space-5)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
