import type { Tab } from '../store/uiStore';

/* ── SVG icons (stroke = couleur héritée via currentColor) ──────────────────── */
type IconProps = { className?: string };
const svg = (children: React.ReactNode) => ({ className }: IconProps) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const IconParking = svg(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>);
export const IconBookings = svg(<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></>);
export const IconPlanning = svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>);
export const IconUsers = svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
export const IconStats = svg(<><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>);
export const IconLogs = svg(<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>);

export type TabDef = {
  id: Tab;
  label: string;
  Icon: React.ComponentType<IconProps>;
  title: string;
  subtitle: string;
};

/* ── Définitions par onglet ─────────────────────────────────────────────────── */
const RESERVATION: TabDef = { id: 'reservation', label: 'Réservation', Icon: IconParking, title: 'Réserver une place', subtitle: 'Choisissez une place libre et validez votre créneau.' };
const MY_BOOKINGS_USER: TabDef = { id: 'my-bookings', label: 'Mes réservations', Icon: IconBookings, title: 'Mes réservations', subtitle: 'Vos réservations à venir et passées.' };
const MY_BOOKINGS_ADMIN: TabDef = { id: 'my-bookings', label: 'Historique', Icon: IconBookings, title: 'Historique', subtitle: 'Historique de vos réservations.' };

const ADMIN_EXTRA: TabDef[] = [
  { id: 'planning', label: 'Planning', Icon: IconPlanning, title: 'Planning du parking', subtitle: 'Vue d’ensemble des places par jour.' },
  { id: 'stats', label: 'Tableau de bord', Icon: IconStats, title: 'Tableau de bord', subtitle: 'Résumé de l’occupation du parking en temps réel.' },
  { id: 'users', label: 'Utilisateurs', Icon: IconUsers, title: 'Utilisateurs', subtitle: 'Gérez les comptes et les accès.' },
  { id: 'logs', label: 'Journal d’activité', Icon: IconLogs, title: 'Journal d’activité', subtitle: 'Toutes les actions enregistrées.' },
];

export function tabsForRole(isAdmin: boolean): TabDef[] {
  return isAdmin
    ? [RESERVATION, MY_BOOKINGS_ADMIN, ...ADMIN_EXTRA]
    : [RESERVATION, MY_BOOKINGS_USER];
}
