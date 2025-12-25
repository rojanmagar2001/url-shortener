export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type VerifiedAccess = {
  userId: string;
  sessionId: string;
};

export type TokenServicePort = {
  issueForUser(userId: string): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<VerifiedAccess>;
};
