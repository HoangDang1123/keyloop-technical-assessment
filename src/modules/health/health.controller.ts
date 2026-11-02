import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
  } catch {
    res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database connection failed' },
    });
  }
}
