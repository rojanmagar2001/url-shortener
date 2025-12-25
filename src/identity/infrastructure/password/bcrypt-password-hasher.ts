import bcrypt from "bcrypt";
import type { PasswordHasherPort } from "@/identity/application/ports/password-hasher.port";

export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly cost: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
