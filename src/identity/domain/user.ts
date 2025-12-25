export type UserId = string;

export type UserRole = "user" | "admin";

export type User = Readonly<{
  id: UserId;
  email: string;
  role: UserRole;
  passwordHash: string | null;
  disabledAt: Date | null;
  createdAt: Date;
}>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
