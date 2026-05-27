export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `${Math.max(2, size / 8)}px solid var(--color-border)`,
      borderTop: `${Math.max(2, size / 8)}px solid var(--color-primary)`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
