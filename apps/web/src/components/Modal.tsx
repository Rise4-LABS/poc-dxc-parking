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
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px 16px 0 0',
          padding: '24px',
          width: '100%',
          maxHeight: '90dvh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
