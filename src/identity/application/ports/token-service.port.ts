export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type TokenServicePort = {
  issueForUser(userId: string): Promise<TokenPair>;
};
