import { useEffect, useState } from "react";
import { AppShell } from "../components/shell/AppShell";
import { Dashboard } from "../routes/dashboard/Dashboard";
import { Tracker } from "../routes/tracker/Tracker";
import { useHabitState } from "../components/habits/useHabitState";

type Route = "dashboard" | "tracker";

function routeFromLocation(): Route {
  return window.location.pathname.startsWith("/tracker") ? "tracker" : "dashboard";
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const habitState = useHabitState();

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
    <AppShell route={route} onNavigate={navigate}>
      {route === "tracker" ? <Tracker state={habitState} /> : <Dashboard state={habitState} onNavigate={navigate} />}
    </AppShell>
  );
}
