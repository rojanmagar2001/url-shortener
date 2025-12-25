export type AuthContext =
  | { kind: "anonymous" }
  | { kind: "user"; userId: string; sessionId: string; role: "user" | "admin" };

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
  }
}
