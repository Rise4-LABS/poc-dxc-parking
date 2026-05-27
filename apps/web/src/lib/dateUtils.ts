export function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
export function formatTimeFr(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(':', 'h');
}
export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
