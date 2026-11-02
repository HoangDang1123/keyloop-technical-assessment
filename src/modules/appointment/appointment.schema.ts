import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  dealershipId: z.number().int().positive(),
  serviceTypeId: z.number().int().positive(),
  startTime: z.string().datetime({ offset: true }),
});

export const appointmentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
