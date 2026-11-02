import { Request, Response, NextFunction } from 'express';
import { ServiceTypeService } from './serviceType.service';

const service = new ServiceTypeService();

export async function listServiceTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serviceTypes = await service.listAll();
    res.json({ data: serviceTypes });
  } catch (err) {
    next(err);
  }
}
