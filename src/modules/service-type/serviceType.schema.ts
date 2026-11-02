import { z } from 'zod';

export const serviceTypeParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
