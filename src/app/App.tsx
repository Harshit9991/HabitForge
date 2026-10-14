import { useEffect, useState } from "react";
import type { AuthClient } from "../data/auth";
import { authClient, supabase } from "../data/supabase-client";
import { createSeededHabitRepository, createSupabaseHabitRepository, type HabitRepository } from "../data/habitforge-repository";
import { AuthGate } from "../components/auth/AuthGate";
import { AppShell } from "../components/shell/AppShell";
import { Dashboard } from "../routes/dashboard/Dashboard";
import { Tracker } from "../routes/tracker/Tracker";
import { useHabitState } from "../components/habits/useHabitState";

type Route = "dashboard" | "tracker";
const demoRepository = createSeededHabitRepository();
const supabaseRepository = supabase ? createSupabaseHabitRepository(supabase) : null;

function routeFromLocation(): Route {
  return window.location.pathname.startsWith("/tracker") ? "tracker" : "dashboard";
}

const demoAuthClient: AuthClient = {
  async getSession() { return { userId: "demo-user", accessToken: "demo-token", expiresAt: Date.now() + 86_400_000 }; },
  async signIn() { return { userId: "demo-user", accessToken: "demo-token", expiresAt: Date.now() + 86_400_000 }; },
  async signUp() { return { session: null, confirmationRequired: true }; },
  async signOut() {},
};

export function App({ client = authClient, repository = supabaseRepository }: { client?: AuthClient | null; repository?: HabitRepository | null }) {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const [localPreview] = useState(import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo"));
  const habitState = useHabitState(localPreview ? demoRepository : repository);

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
      {() => (
        !localPreview && !repository ? <main className="auth-page"><p className="sync-copy">Journey persistence is not configured.</p></main> :
        habitState.loading ? <main className="auth-page"><p className="sync-copy">Loading your journey...</p></main> :
          <AppShell route={route} onNavigate={navigate}>
            {route === "tracker" ? <Tracker state={habitState} /> : <Dashboard state={habitState} onNavigate={navigate} />}
          </AppShell>
      )}
    </AuthGate>
  );
}
