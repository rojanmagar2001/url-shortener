export type AuthContext =
  | { kind: "anonymous" }
  | { kind: "user"; userId: string; sessionId: string; role: "user" | "admin" }
  | { kind: "api_key"; apiKeyId: string; userId: string; scopes: string[] };

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
  }
}
