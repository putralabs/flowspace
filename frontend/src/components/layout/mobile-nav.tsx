import { NavLink } from "react-router-dom";
import { FolderKanban, Home, Inbox, ListChecks, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/my-tasks", icon: ListChecks, label: "Tasks" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/settings/profile", icon: User, label: "Profile" },
];

export function MobileNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-100",
              isActive ? "text-accent" : "text-text-muted",
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
