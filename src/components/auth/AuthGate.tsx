import { FormEvent, useEffect, useState } from "react";
import type { AuthClient, AuthSession } from "../../data/auth";

export function AuthGate({
  client,
  children,
}: {
  client: AuthClient | null;
  children: (session: AuthSession) => React.ReactNode;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Checking your session...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) {
      setStatus("Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect HabitForge.");
      return;
    }
    client.getSession().then(setSession).catch(() => setStatus("Your session could not be restored. Please sign in again."));
  }, [client]);

  if (session) {
    return <>{children(session)}</>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setStatus("");
    try {
      if (mode === "sign-in") {
        setSession(await client.signIn(email, password));
      } else {
        const result = await client.signUp(email, password);
        setStatus(result.confirmationRequired ? "Check your email to confirm your account." : "Account created.");
        if (result.session) setSession(result.session);
      }
    } catch {
      setStatus("Authentication failed. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <p className="eyebrow">PRIVATE ACCOUNT</p>
        <h1 id="auth-heading">{mode === "sign-in" ? "Enter the forge." : "Start your forge."}</h1>
        <p className="lede">Your journeys stay private and sync across your signed-in devices.</p>
        <form onSubmit={submit}>
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!client || busy} />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={!client || busy} />
          <button className="button button-primary" type="submit" disabled={!client || busy}>
            {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="auth-status" role="status">{status}</p>
        {client && (
          <button className="button button-ghost" type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
            {mode === "sign-in" ? "Need an account?" : "Already have an account?"}
          </button>
        )}
      </section>
    </main>
  );
}
