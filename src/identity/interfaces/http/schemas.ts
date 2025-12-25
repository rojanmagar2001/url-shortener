import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(200),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});
