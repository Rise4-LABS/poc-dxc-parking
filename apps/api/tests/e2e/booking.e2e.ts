import { test, expect } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:3000';

let accessToken = '';
let refreshToken = '';
let bookingId = '';
let spotId = '';

test.describe('DriveXchange Parking API — E2E', () => {
  test('GET /health → 200 ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('POST /api/auth/login with bad PIN → 401', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/login`, {
      data: { accessId: 'MAR001', pin: '0000' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/login with valid credentials → 200 + tokens', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/login`, {
      data: { accessId: 'MAR001', pin: '1234' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.name).toBe('Marie Dupont');
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  test('GET /api/spots → 200 with spots array', async ({ request }) => {
    const res = await request.get(`${API}/api/spots`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const spots = await res.json();
    expect(Array.isArray(spots)).toBe(true);
    expect(spots.length).toBeGreaterThan(0);
    const freeSpot = spots.find((s: any) => s.status === 'FREE');
    expect(freeSpot).toBeTruthy();
    spotId = freeSpot.id;
  });

  test('GET /api/spots without auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/api/spots`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/bookings → 201 creates booking', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);

    const res = await request.post(`${API}/api/bookings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { spotId, date, startTime: '09:00', endTime: '17:00' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('CONFIRMED');
    bookingId = body.id;
  });

  test('POST /api/bookings again same day → 409 active booking exists', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);

    const res = await request.post(`${API}/api/bookings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { spotId, date, startTime: '09:00', endTime: '17:00' },
    });
    expect(res.status()).toBe(409);
  });

  test('GET /api/bookings/me → includes created booking', async ({ request }) => {
    const res = await request.get(`${API}/api/bookings/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const bookings = await res.json();
    const found = bookings.find((b: any) => b.id === bookingId);
    expect(found).toBeTruthy();
    expect(found.status).toBe('CONFIRMED');
  });

  test('PATCH /api/bookings/:id/cancel → cancels booking', async ({ request }) => {
    const res = await request.patch(`${API}/api/bookings/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('CANCELLED');
  });

  test('Spot is FREE again after cancellation', async ({ request }) => {
    const res = await request.get(`${API}/api/spots`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const spots = await res.json();
    const spot = spots.find((s: any) => s.id === spotId);
    expect(spot.status).toBe('FREE');
  });

  test('GET /api/admin/stats → 403 for USER role', async ({ request }) => {
    const res = await request.get(`${API}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('Admin login → access to /api/admin/stats', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { accessId: 'ADMIN1', pin: '1234' },
    });
    expect(loginRes.status()).toBe(200);
    const { accessToken: adminToken } = await loginRes.json();

    const statsRes = await request.get(`${API}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(statsRes.status()).toBe(200);
    const stats = await statsRes.json();
    expect(typeof stats.free).toBe('number');
    expect(typeof stats.total).toBe('number');
  });

  test('POST /api/auth/refresh → rotates tokens', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/refresh`, {
      data: { refreshToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(refreshToken);
    refreshToken = body.refreshToken;
  });

  test('Reuse of old refresh token → 401 TOKEN_REUSED', async ({ request }) => {
    const oldRefreshToken = refreshToken;
    // rotate once more to make oldRefreshToken stale
    await request.post(`${API}/api/auth/refresh`, { data: { refreshToken: oldRefreshToken } });
    // attempt reuse
    const res = await request.post(`${API}/api/auth/refresh`, {
      data: { refreshToken: oldRefreshToken },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('TOKEN_REUSED');
  });

  test('POST /api/auth/logout → 204', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/login`, {
      data: { accessId: 'MAR001', pin: '1234' },
    });
    const { refreshToken: rt } = await loginRes.json();
    const res = await request.post(`${API}/api/auth/logout`, { data: { refreshToken: rt } });
    expect(res.status()).toBe(204);
  });
});
