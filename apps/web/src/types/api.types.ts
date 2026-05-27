export interface Spot {
  id: string; number: string; label: string | null;
  type: string; status: string;
}

export type BookingSource = 'USER' | 'ADMIN';

export interface Booking {
  id: string; userId: string; spotId: string;
  date: string; startTime: string; endTime: string | null;
  status: string; checkedIn: boolean;
  checkedInAt: string | null; releasedAt: string | null;
  // admin fields
  source?: BookingSource;
  vehicleLabel?: string | null;
  isIndefinite?: boolean;
  adminNote?: string | null;
}

export interface User {
  id: string; name: string; accessId: string; role: string; locale: string;
  active: boolean;
  pin?: string;   // présent uniquement dans les réponses admin
}

export interface UserPayload {
  name: string;
  accessId: string;
  pin?: string;          // optionnel en édition (vide = inchangé)
  role: string;
  active: boolean;
  locale?: string;
}

export type BookingWithSpot = Booking & { spot?: Spot; user?: User };

export type LogAction =
  | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED';

export interface AuditLog {
  id: string;
  action: LogAction;
  userId: string | null;
  userName: string | null;
  accessId: string | null;
  role: string | null;
  detail: string | null;
  timestamp: string;
}
