import { useEffect, useMemo, useState } from "react";
import type { AuthClient } from "../data/auth";
import { authClient, supabase } from "../data/supabase-client";
import { createSeededHabitRepository, createSupabaseHabitRepository, type HabitRepository } from "../data/habitforge-repository";
import { AuthGate } from "../components/auth/AuthGate";
import { AppShell } from "../components/shell/AppShell";
import { Dashboard } from "../routes/dashboard/Dashboard";
import { Tracker } from "../routes/tracker/Tracker";
import { useHabitState } from "../components/habits/useHabitState";

type Route = "dashboard" | "tracker";

function routeFromLocation(): Route {
  return window.location.pathname.startsWith("/tracker") ? "tracker" : "dashboard";
}

const demoAuthClient: AuthClient = {
  async getSession() { return { userId: "demo-user", accessToken: "demo-token", expiresAt: Date.now() + 86_400_000 }; },
  async signIn() { return { userId: "demo-user", accessToken: "demo-token", expiresAt: Date.now() + 86_400_000 }; },
  async signUp() { return { session: null, confirmationRequired: true }; },
  async signOut() {},
};

export function App({ client = authClient, repository = null }: { client?: AuthClient | null; repository?: HabitRepository | null }) {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const [localPreview] = useState(import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo"));
  const [demoRepository] = useState(createSeededHabitRepository);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextRoute: Route) {
    const path = nextRoute === "tracker" ? "/tracker" : "/";
    window.history.pushState({}, "", path);
    setRoute(nextRoute);
  }

  return (
    <AuthGate client={localPreview ? demoAuthClient : client}>
      {(session) => <AuthenticatedBoundary
        route={route}
        onNavigate={navigate}
        sessionId={session.userId}
        localPreview={localPreview}
        demoRepository={demoRepository}
        repository={repository}
      />}
    </AuthGate>
  );
}

function AuthenticatedBoundary({
  route,
  onNavigate,
  sessionId,
  localPreview,
  demoRepository,
  repository,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  sessionId: string;
  localPreview: boolean;
  demoRepository: HabitRepository;
  repository: HabitRepository | null;
}) {
  const sessionRepository = useMemo(
    () => (localPreview ? demoRepository : repository ?? (supabase ? createSupabaseHabitRepository(supabase) : null)),
    [localPreview, demoRepository, repository, sessionId],
  );
  return <AuthenticatedApp route={route} onNavigate={onNavigate} repository={sessionRepository} />;
}

function AuthenticatedApp({
  route,
  onNavigate,
  repository,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  repository: HabitRepository | null;
}) {
  const habitState = useHabitState(repository);
  if (!repository) return <main className="auth-page"><p className="sync-copy">Journey persistence is not configured.</p></main>;
  if (habitState.loading) return <main className="auth-page"><p className="sync-copy">Loading your journey...</p></main>;
  return (
    <AppShell route={route} onNavigate={onNavigate}>
      {route === "tracker" ? <Tracker state={habitState} /> : <Dashboard state={habitState} onNavigate={onNavigate} />}
    </AppShell>
  );
}
