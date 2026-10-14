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

interface SupabaseSession {
  access_token: string;
  expires_at?: number;
  user: { id: string };
}

interface SupabaseAuthApi {
  auth: {
    getSession(): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
    signInWithPassword(input: { email: string; password: string }): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
    signUp(input: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
    signOut(): Promise<{ error: Error | null }>;
  };
}

function toAuthSession(session: SupabaseSession | null): AuthSession | null {
  if (!session) {
    return null;
  }

  return {
    userId: session.user.id,
    accessToken: session.access_token,
    expiresAt: (session.expires_at ?? 0) * 1000,
  };
}

export function createSupabaseAuthClient(
  api: SupabaseAuthApi,
  getRedirectUrl: () => string = () => window.location.origin,
): AuthClient {
  return {
    async getSession() {
      const { data, error } = await api.auth.getSession();
      if (error) throw error;
      return toAuthSession(data.session);
    },
    async signIn(email, password) {
      const { data, error } = await api.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = toAuthSession(data.session);
      if (!session) throw new Error("Authentication succeeded without a session");
      return session;
    },
    async signUp(email, password) {
      const { data, error } = await api.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getRedirectUrl() },
      });
      if (error) throw error;
      return { session: toAuthSession(data.session), confirmationRequired: data.session === null };
    },
    async signOut() {
      const { error } = await api.auth.signOut();
      if (error) throw error;
    },
  };
}

export function isSessionExpired(session: AuthSession, now = Date.now()): boolean {
  return session.expiresAt <= now;
}
