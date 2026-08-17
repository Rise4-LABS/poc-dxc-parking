export function Spinner({ size = 24 }: { size?: number }) {
  const stroke = Math.max(2, size / 8);
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `${stroke}px solid var(--color-border)`,
      borderTopColor: 'var(--brand)',
      borderRightColor: 'var(--brand)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
