import type { User } from "@/identity/domain/user";
import type {
  CreateUserInput,
  UserRepositoryPort,
} from "@/identity/application/ports/user-repository.port";
import type { PrismaClient } from "@/generated/prisma/client";

function mapUser(row: {
  id: string;
  email: string;
  role: "user" | "admin";
  passwordHash: string | null;
  disabledAt: Date | null;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash,
    disabledAt: row.disabledAt,
    createdAt: row.createdAt,
  };
}

export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? mapUser(row) : null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: "user",
      },
    });
    return mapUser(row);
  }
}
