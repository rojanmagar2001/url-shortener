import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ERRORS, isAppError } from "@/shared/errors";

type ErrorResponse = {
  error: string; // ALWAYS the code
  message: string; // human-readable safe message
  requestId?: string;
  details?: unknown;
};

function requestIdOf(req: FastifyRequest): string | undefined {
  const id = (req as any).id;
  return typeof id === "string" ? id : undefined;
}

export async function registerErrorHandler(
  app: FastifyInstance,
): Promise<void> {
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

      if (error instanceof ZodError) {
        const def = ERRORS.VALIDATION_ERROR;
        const body: ErrorResponse = {
          error: def.code,
          message: def.message,
          requestId,
          details: error.flatten(),
        };
        return reply.status(def.statusCode).send(body);
      }

      if (isAppError(error)) {
        const body: ErrorResponse = {
          error: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        };
        return reply.status(error.statusCode).send(body);
      }

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
