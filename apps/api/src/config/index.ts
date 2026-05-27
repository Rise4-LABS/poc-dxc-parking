export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? 'dev-admin-jwt-secret',
  jwtExpiresIn: '30m',
  refreshExpiresIn: '30d',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
};
