export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type VerifiedAccess = {
  userId: string;
  sessionId: string;
  role: "user" | "admin";
};

export type TokenServicePort = {
  issueForUser(userId: string): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<VerifiedAccess>;
};
