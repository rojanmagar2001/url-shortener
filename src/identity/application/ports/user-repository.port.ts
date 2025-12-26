import type { User } from "@/identity/domain/user";

export type CreateUserInput = {
  email: string;
  passwordHash: string | null;
};

export type UserRepositoryPort = {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  setRole(userId: string, role: "user" | "admin"): Promise<void>;
};
