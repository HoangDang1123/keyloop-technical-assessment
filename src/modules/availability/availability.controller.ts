import { Request, Response, NextFunction } from 'express';
import { AvailabilityService } from './availability.service';
import { AvailabilityQuery } from './availability.schema';

const service = new AvailabilityService();

export async function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as AvailabilityQuery;
    const result = await service.checkAvailability(
      query.dealershipId,
      query.serviceTypeId,
      query.startTime,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
