import type { FastifyInstance } from "fastify";
import "@/identity/interfaces/http/auth-context.js";
import { requireAdmin } from "@/identity/interfaces/http/middleware.js";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/ping", async (req) => {
    requireAdmin(req.auth);
    return { ok: true };
  });
}
