import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z.array(z.string().min(1)).max(50),
  expiresAt: z.coerce.date().nullable().default(null),
});
