import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export type PrismaClientLike = PrismaClient;

/**
 * Factory so tests can create clients pointing at ephemeral Testcontainers DBs
 * without mutating global process.env state.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  return prisma;
}
