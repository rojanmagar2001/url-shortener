export type Session = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type SessionRepositoryPort = {
  createSession(args: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  revokeSession(id: string, revokedAt: Date): Promise<void>;
};
