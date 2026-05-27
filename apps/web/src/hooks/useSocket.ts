import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useSpotStore } from '../store/spotStore';
import type { Spot } from '../types/api.types';

export function useSocket() {
  const { accessToken } = useAuthStore();
  const { updateSpot } = useSpotStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('spot:updated', (spot: Spot) => updateSpot(spot.id, spot));

    return () => { socket.disconnect(); };
  }, [accessToken, updateSpot]);
}
