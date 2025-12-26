import { z } from "zod";

export const createLinkSchema = z.object({
  originalUrl: z.string().min(1).max(2048),
  customAlias: z.string().min(3).max(64).nullable().default(null),
  expiresAt: z.coerce.date().nullable().default(null),
});
