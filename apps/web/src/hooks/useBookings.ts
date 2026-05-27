import { useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useSpotStore } from '../store/spotStore';
import { useUiStore } from '../store/uiStore';
import { todayIso } from '../lib/dateUtils';

export function useBookings() {
  const { setMyBookings, setTodayBooking, setLoading, setError } = useSpotStore();
  const { addToast } = useUiStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const bookings = await api.getMyBookings();
      setMyBookings(bookings);
      const today = todayIso();
      const todayB = bookings.find((b) => b.date === today && b.status !== 'CANCELLED') ?? null;
      setTodayBooking(todayB);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [setMyBookings, setTodayBooking, setLoading, setError, addToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { refresh };
}
