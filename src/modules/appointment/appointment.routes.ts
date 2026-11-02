import { Router } from 'express';
import { createAppointment, getAppointmentById } from './appointment.controller';
import { validate } from '../../middleware/validate';
import { createAppointmentSchema, appointmentParamsSchema } from './appointment.schema';

const router = Router();

router.post('/', validate(createAppointmentSchema, 'body'), createAppointment);
router.get('/:id', validate(appointmentParamsSchema, 'params'), getAppointmentById);

export { router as appointmentRoutes };
