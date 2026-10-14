import { useEffect, useState } from "react";
import type { AuthClient } from "../data/auth";
import { authClient } from "../data/supabase-client";
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

export function App({ client = authClient }: { client?: AuthClient | null }) {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const habitState = useHabitState();
  const localPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");

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
        <AppShell route={route} onNavigate={navigate}>
          {route === "tracker" ? <Tracker state={habitState} /> : <Dashboard state={habitState} onNavigate={navigate} />}
        </AppShell>
      )}
    </AuthGate>
  );
}
