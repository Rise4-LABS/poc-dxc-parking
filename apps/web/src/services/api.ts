import { useAuthStore } from '../store/authStore';
import type { Spot, Booking, User, BookingWithSpot, UserPayload, AuditLog } from '../types/api.types';

const BASE = '/api';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const state = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}),
  };

  let res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401 && state.accessToken) {
    const refreshed = await state.refreshTokens();
    if (refreshed) {
      headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      res = await fetch(`${BASE}${path}`, { ...opts, headers });
    } else {
      state.logout();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error((err as { message?: string }).message ?? `Erreur HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface BookingInput {
  spotId: string;
  date: string;
  startTime: string;
  endTime: string;
  joinWaitListIfFull?: boolean;
  /** Récurrence hebdomadaire : répète la réservation chaque semaine jusqu'à cette date incluse */
  repeatWeeklyUntil?: string;
}

/** Réponse du serveur quand repeatWeeklyUntil est fourni */
export interface RecurringBookingResult {
  bookings: Booking[];
  skipped: string[];   // dates en conflit, non réservées
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  activateAccount: (token: string, password: string) =>
    request<{ message: string }>('/auth/activate', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  getSpots: (date?: string) =>
    request<Spot[]>(`/spots${date ? `?date=${date}` : ''}`),

  getMyBookings: () =>
    request<BookingWithSpot[]>('/bookings/me'),

  createBooking: (data: BookingInput) =>
    request<Booking | RecurringBookingResult>('/bookings', { method: 'POST', body: JSON.stringify(data) }),

  cancelBooking: (id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' }),

  updateBooking: (id: string, data: { date: string; startTime: string; endTime: string }) =>
    request<Booking>(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  checkIn: (id: string) =>
    request<Booking>(`/bookings/${id}/check-in`, { method: 'PATCH' }),

  release: (id: string) =>
    request<Booking>(`/bookings/${id}/release`, { method: 'PATCH' }),

  getAdminStats: () =>
    request<{ free: number; reserved: number; occupied: number; blocked: number; total: number }>('/admin/stats'),

  blockSpot: (spotId: string, reason: string) =>
    request<void>(`/admin/spots/${spotId}/block`, { method: 'POST', body: JSON.stringify({ reason }) }),

  unblockSpot: (spotId: string) =>
    request<void>(`/admin/spots/${spotId}/unblock`, { method: 'POST' }),

  getUsers: () =>
    request<User[]>('/admin/users'),

  getAllBookings: (from: string, to: string) =>
    request<BookingWithSpot[]>(`/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  adminCancelBooking: (id: string) =>
    request<Booking>(`/admin/bookings/${id}/cancel`, { method: 'PATCH' }),

  getLogs: () =>
    request<AuditLog[]>('/admin/logs'),

  createUser: (data: UserPayload) =>
    request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: Partial<UserPayload>) =>
    request<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id: string) =>
    request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  resendActivation: (id: string) =>
    request<User>(`/admin/users/${id}/resend-activation`, { method: 'POST' }),

  adminCreateBooking: (data: AdminBookingPayload) =>
    request<BookingWithSpot[]>('/admin/bookings', { method: 'POST', body: JSON.stringify(data) }),

  adminUpdateBooking: (id: string, data: Partial<AdminBookingPayload>) =>
    request<BookingWithSpot>(`/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  adminDeleteBooking: (id: string) =>
    request<void>(`/admin/bookings/${id}`, { method: 'DELETE' }),
};

export interface AdminBookingPayload {
  spotId: string;
  startDate: string;
  endDate?: string;
  date?: string; // édition d'une résa unique : le PATCH admin mappe `date` (pas startDate)
  startTime: string;
  endTime?: string | null;
  userId?: string;
  vehicleLabel?: string;
  isIndefinite?: boolean;
  adminNote?: string;
}
