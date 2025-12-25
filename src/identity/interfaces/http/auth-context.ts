export type AuthContext =
  | { kind: "anonymous" }
  | { kind: "user"; userId: string; sessionId: string };

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
  }
}
