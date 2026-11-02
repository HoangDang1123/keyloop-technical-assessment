import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentInput } from './appointment.schema';

const service = new AppointmentService();

export async function createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateAppointmentInput;
    const appointment = await service.createAppointment(input, req.id ? String(req.id) : undefined);
    res.status(201).json({ data: appointment });
  } catch (err) {
    next(err);
  }
}

export async function getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const appointment = await service.getAppointmentById(id);
    res.json({ data: appointment });
  } catch (err) {
    next(err);
  }
}
