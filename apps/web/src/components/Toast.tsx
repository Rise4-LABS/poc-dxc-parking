import { useUiStore } from '../store/uiStore';

const TYPE_ICON: Record<string, string> = {
  success: '✅',
  error:   '⚠️',
  info:    'ℹ️',
};

const TYPE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  info:    { bg: '#f0f9ff', border: '#7dd3fc', color: '#0c4a6e' },
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
      gap: '8px',
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
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 500,
              background: s.bg,
              color: s.color,
              border: `1px solid ${s.border}`,
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'auto',
              animation: 'toastIn 0.22s cubic-bezier(.16,1,.3,1)',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1.3, flexShrink: 0 }}>
              {TYPE_ICON[toast.type]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: s.color,
                opacity: 0.6,
                fontSize: '16px',
                lineHeight: 1,
                padding: '0 2px',
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
