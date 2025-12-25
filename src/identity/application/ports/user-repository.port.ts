import type { User } from "@/identity/domain/user";

export type CreateUserInput = {
  email: string;
  passwordHash: string;
};

export type UserRepositoryPort = {
  findByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
};
