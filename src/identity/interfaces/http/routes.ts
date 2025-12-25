import type { FastifyInstance } from "fastify";
import { registerSchema, loginSchema } from "./schemas";
import type { RegisterWithPasswordDeps } from "@/identity/application/use-cases/register-with-password";
import { registerWithPassword } from "@/identity/application/use-cases/register-with-password";
import type { LoginWithPasswordDeps } from "@/identity/application/use-cases/login-with-password";
import { loginWithPassword } from "@/identity/application/use-cases/login-with-password";
import { AppError } from "@/shared/errors/index";

export type IdentityHttpDeps = {
  registerDeps: RegisterWithPasswordDeps;
  loginDeps: LoginWithPasswordDeps;
};

export async function registerIdentityRoutes(
  app: FastifyInstance,
  deps: IdentityHttpDeps,
): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await registerWithPassword(deps.registerDeps, parsed.data);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof AppError) {
        return reply
          .status(err.statusCode)
          .send({ error: err.code, message: err.message });
      }
      req.log.error({ err }, "register failed");
      return reply.status(500).send({ error: "INTERNAL_ERROR" });
    }
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await loginWithPassword(deps.loginDeps, parsed.data);
      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof AppError) {
        return reply
          .status(err.statusCode)
          .send({ error: err.code, message: err.message });
      }
      req.log.error({ err }, "login failed");
      return reply.status(500).send({ error: "INTERNAL_ERROR" });
    }
  });
}
