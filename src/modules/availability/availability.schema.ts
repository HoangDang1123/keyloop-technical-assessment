import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  dealershipId: z.coerce.number().int().positive(),
  serviceTypeId: z.coerce.number().int().positive(),
  startTime: z.string().datetime({ offset: true }),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
