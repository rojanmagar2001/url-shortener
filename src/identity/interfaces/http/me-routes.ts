import type { FastifyInstance } from "fastify";
import "@/identity/interfaces/http/auth-context.js";
import { requireAuth } from "@/identity/interfaces/http/middleware.js";

export async function registerMeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (req) => {
    requireAuth(req.auth);
    return { userId: req.auth.userId, sessionId: req.auth.sessionId };
  });
}
