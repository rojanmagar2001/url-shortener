import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, ERRORS, isAppError } from "@/shared/errors";

type ErrorResponse = {
  error: string;
  message: string;
  requestId?: string;
  details?: unknown;
};

function requestIdOf(req: FastifyRequest): string | undefined {
  // Fastify sets req.id by default
  const id = (req as any).id;
  return typeof id === "string" ? id : undefined;
}

export async function registerErrorHandler(
  app: FastifyInstance,
): Promise<void> {
  // 404 handler (so it uses same envelope)
  app.setNotFoundHandler(async (req, reply) => {
    const def = ERRORS.NOT_FOUND;
    const body: ErrorResponse = {
      error: def.code,
      message: def.message,
      requestId: requestIdOf(req),
    };
    return reply.status(def.statusCode).send(body);
  });

  app.setErrorHandler(
    async (error: unknown, req: FastifyRequest, reply: FastifyReply) => {
      const requestId = requestIdOf(req);

      // Zod validation errors
      if (error instanceof ZodError) {
        const def = ERRORS.VALIDATION_ERROR;
        const body: ErrorResponse = {
          error: def.code,
          message: def.message,
          requestId,
        };
        return reply.status(def.statusCode).send(body);
      }

      // Our typed app errors
      if (isAppError(error)) {
        const body: ErrorResponse = {
          error: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        };
        return reply.status(error.statusCode).send(body);
      }

      // Unknown errors -> 500, log full error server-side
      req.log.error({ err: error }, "unhandled error");

      const def = ERRORS.INTERNAL_ERROR;
      const body: ErrorResponse = {
        error: def.code,
        message: def.message,
        requestId,
      };
      return reply.status(def.statusCode).send(body);
    },
  );
}
