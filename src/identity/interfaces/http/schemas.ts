import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(200),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export const providerAuthSchema = z.object({
  provider: z.enum(["local", "google", "auth0", "oidc"]),
  input: z.unknown(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
