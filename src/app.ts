import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { requestIdMiddleware } from './lib/requestId';
import { errorHandler } from './middleware/errorHandler';
import { healthRoutes } from './modules/health/health.routes';
import { serviceTypeRoutes } from './modules/service-type/serviceType.routes';
import { availabilityRoutes } from './modules/availability/availability.routes';
import { appointmentRoutes } from './modules/appointment/appointment.routes';
import { swaggerRouter } from './swagger';

export function createApp() {
  const app = express();

  // --- Middleware ---
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id as string,
      customLogLevel: (_req, res, error) => {
        if (res.statusCode >= 500 || error) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Don't log health checks in production
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );
  app.use(express.json());

  // --- Routes ---
  app.use(healthRoutes);
  app.use('/api/v1/service-types', serviceTypeRoutes);
  app.use('/api/v1/availability', availabilityRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api-docs', swaggerRouter);

  // --- Error handling ---
  app.use(errorHandler);

  return app;
}
