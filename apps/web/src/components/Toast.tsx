import { useUiStore } from '../store/uiStore';

const TYPE_ICON: Record<string, string> = {
  success: '✅',
  error:   '⚠️',
  info:    'ℹ️',
};

const TYPE_STYLE: Record<string, { bg: string; accent: string; color: string }> = {
  success: { bg: 'var(--status-free-bg)',     accent: 'var(--status-free-fg)',     color: 'var(--status-free-fg)' },
  error:   { bg: 'var(--status-occupied-bg)', accent: 'var(--status-occupied-fg)', color: 'var(--status-occupied-fg)' },
  info:    { bg: 'var(--status-offslot-bg)',  accent: 'var(--status-offslot-fg)',  color: 'var(--status-offslot-fg)' },
};

export function Toast() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: 'min(calc(100vw - 40px), 360px)',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const s = TYPE_STYLE[toast.type] ?? TYPE_STYLE.info;
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '13px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 500,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderLeft: `4px solid ${s.accent}`,
              boxShadow: 'var(--shadow-lg)',
              pointerEvents: 'auto',
              animation: 'toastIn 0.22s cubic-bezier(.16,1,.3,1)',
            }}
          >
            <span style={{
              flexShrink: 0,
              width: '26px', height: '26px',
              display: 'grid', placeItems: 'center',
              borderRadius: 'var(--radius-full)',
              background: s.bg,
              fontSize: '14px', lineHeight: 1,
            }}>
              {TYPE_ICON[toast.type]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4, paddingTop: '4px' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                opacity: 0.7,
                fontSize: '18px',
                lineHeight: 1,
                padding: '2px 2px',
              }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
