export interface AuthSession {
  userId: string;
  accessToken: string;
  expiresAt: number;
}

export interface AuthClient {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string): Promise<{ session: AuthSession | null; confirmationRequired: boolean }>;
  signOut(): Promise<void>;
}

export function isSessionExpired(session: AuthSession, now = Date.now()): boolean {
  return session.expiresAt <= now;
}
