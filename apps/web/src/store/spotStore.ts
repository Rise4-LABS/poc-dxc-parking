import { create } from 'zustand';
import type { Spot, BookingWithSpot } from '../types/api.types';

interface SpotState {
  spots: Spot[];
  myBookings: BookingWithSpot[];
  todayBooking: BookingWithSpot | null;
  isLoading: boolean;
  error: string | null;
  setSpots: (spots: Spot[]) => void;
  updateSpot: (spotId: string, patch: Partial<Spot>) => void;
  setMyBookings: (bookings: BookingWithSpot[]) => void;
  setTodayBooking: (booking: BookingWithSpot | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSpotStore = create<SpotState>((set) => ({
  spots: [],
  myBookings: [],
  todayBooking: null,
  isLoading: false,
  error: null,
  setSpots: (spots) => set({ spots }),
  updateSpot: (spotId, patch) =>
    set((s) => ({ spots: s.spots.map((sp) => (sp.id === spotId ? { ...sp, ...patch } : sp)) })),
  setMyBookings: (myBookings) => set({ myBookings }),
  setTodayBooking: (todayBooking) => set({ todayBooking }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
