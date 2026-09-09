import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/settings/profile", label: "Profile" },
  { to: "/settings/workspace", label: "Workspace" },
  { to: "/settings/members", label: "Members" },
  { to: "/settings/notifications", label: "Notifications" },
];

export function SettingsLayout() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header>
        <h1 className="text-page-title text-text-primary">Settings</h1>
      </header>
      <nav aria-label="Settings sections" className="mt-5 flex gap-4 border-b border-border-strong">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors duration-150",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  );
}
