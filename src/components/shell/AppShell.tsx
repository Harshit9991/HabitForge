import type { ReactNode } from "react";

type Route = "dashboard" | "tracker";

const links: Array<{ route: Route; label: string; shortLabel: string }> = [
  { route: "dashboard", label: "Dashboard", shortLabel: "Home" },
  { route: "tracker", label: "Daily tracker", shortLabel: "Track" },
];

export function AppShell({
  route,
  onNavigate,
  children,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("dashboard"); }}>
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>HabitForge</span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink key={link.route} {...link} active={route === link.route} onNavigate={onNavigate} />
          ))}
        </nav>
        <div className="topbar-actions">
          <span className="sync-indicator"><span className="status-dot" aria-hidden="true" />Ready locally</span>
          <button className="avatar-button" type="button" aria-label="Open account menu">HF</button>
        </div>
      </header>
      <main className="page-content">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map((link) => (
          <NavLink key={link.route} {...link} active={route === link.route} mobile onNavigate={onNavigate} />
        ))}
        <button className="mobile-nav-link" type="button" aria-label="Open settings">
          <span aria-hidden="true">::</span><span>Settings</span>
        </button>
      </nav>
    </div>
  );
}

function NavLink({
  route,
  label,
  shortLabel,
  active,
  mobile,
  onNavigate,
}: {
  route: Route;
  label: string;
  shortLabel: string;
  active: boolean;
  mobile?: boolean;
  onNavigate: (route: Route) => void;
}) {
  return (
    <a
      className={`${mobile ? "mobile-nav-link" : "nav-link"} ${active ? "active" : ""}`}
      href={route === "tracker" ? "/tracker" : "/"}
      aria-current={active ? "page" : undefined}
      onClick={(event) => { event.preventDefault(); onNavigate(route); }}
    >
      <span aria-hidden="true">{mobile ? (route === "tracker" ? "[]" : "##") : ""}</span>
      <span>{mobile ? shortLabel : label}</span>
    </a>
  );
}
