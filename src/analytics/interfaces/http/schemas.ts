import { z } from "zod";

export const topLinksQuerySchema = z.object({
  minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(60),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
