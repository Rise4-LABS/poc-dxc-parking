import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { authRouter } from './interfaces/http/routes/auth.routes';
import { spotsRouter } from './interfaces/http/routes/spots.routes';
import { bookingsRouter } from './interfaces/http/routes/bookings.routes';
import { adminRouter } from './interfaces/http/routes/admin.routes';
import { errorHandler } from './interfaces/http/middlewares/errorHandler';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/spots', spotsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);
