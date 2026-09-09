import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsOf, projectUrl } from "@/lib/constants";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";
import { useMyInvitations, useProjects, useWorkspaces } from "@/hooks/queries";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { Logo } from "@/components/ui/logo";

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-100",
          isActive
            ? "bg-accent-soft text-accent"
            : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 -left-3 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent transition-opacity duration-150",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          {Icon && <Icon size={16} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-5 pb-1.5 text-eyebrow text-text-muted">{children}</div>;
}

function WorkspaceSwitcher() {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUi((s) => s.setActiveWorkspace);
  const navigate = useNavigate();
  const location = useLocation();
  const workspacesQuery = useWorkspaces();
  const workspaces = workspacesQuery.data ?? [];
  const ws = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  // URL-driven pages (workspace detail, project detail) do not follow the
  // active workspace on their own, so move them along when switching.
  function selectWorkspace(id: number, close: () => void) {
    setActiveWorkspace(id);
    close();
    const path = location.pathname;
    if (/^\/workspaces\/[^/]+/.test(path)) {
      navigate(`/workspaces/${id}`);
    } else if (/^\/projects\/[^/]+/.test(path)) {
      navigate("/projects");
    }
  }
  const initials = ws ? initialsOf(ws.name) : "??";
  const inviteCount = useMyInvitations().data?.length ?? 0;

  return (
    <Dropdown
      width="w-[224px]"
      trigger={
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors duration-100 hover:bg-surface-secondary"
          aria-label={`Switch workspace, current: ${ws?.name ?? "none"}`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-xs font-semibold text-text-secondary ring-1 ring-border">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-text-primary">
              {ws?.name ?? "No workspace"}
            </span>
            <span className="block text-[11px] text-text-muted">Workspace</span>
          </span>
          {inviteCount > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white"
              title={`${inviteCount} pending workspace invitation${inviteCount === 1 ? "" : "s"}`}
            >
              {inviteCount}
            </span>
          )}
          <ChevronDown size={13} className="shrink-0 text-text-muted" />
        </button>
      }
    >
      {(close) => (
        <>
          <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            Workspaces
          </div>
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => selectWorkspace(w.id, close)}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-100 ${
                w.id === ws?.id ? "bg-accent-soft text-accent" : "text-text-primary hover:bg-surface-secondary"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="text-[11px] text-text-muted capitalize">{w.my_role}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              close();
              navigate("/workspaces");
            }}
            className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-[13px] text-text-primary transition-colors duration-100 hover:bg-surface-secondary"
          >
            All workspaces
          </button>

        </>
      )}
    </Dropdown>
  );
}

export function SidebarContent() {
  const user = useAuth((s) => s.user);
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);
  const projectsQuery = useProjects(activeWorkspaceId);
  const projectCount = projectsQuery.data?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-1">
        <Link to="/dashboard" className="inline-flex items-center gap-2" aria-label="Flowspace home">
          <Logo size={20} />
          <span className="text-[15px] font-semibold tracking-tight text-text-primary">
            Flowspace
          </span>
        </Link>
      </div>

      <div className="px-3 pt-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-3" aria-label="Main navigation">
        <SectionLabel>General</SectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Overview" />
          <NavItem to="/inbox" icon={Inbox} label="Inbox" />
          <NavItem to="/my-tasks" icon={ListChecks} label="My Tasks" />
        </div>

        <SectionLabel>Projects</SectionLabel>
        <div className="space-y-0.5">
          <SidebarProjects />
          <NavItem to="/projects" icon={FolderKanban} label={`All projects (${projectCount})`} />
        </div>

        <SectionLabel>Team</SectionLabel>
        <div className="space-y-0.5">
          <NavItem to={`/workspaces/${activeWorkspaceId ?? ""}`} icon={Users} label="Members" />
        </div>
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="space-y-0.5">
          <NavItem to="/settings/profile" icon={Settings} label="Settings" />
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-secondary hover:text-text-primary"
          >
            <CircleHelp size={16} className="shrink-0" />
            Help &amp; shortcuts
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <Avatar
            initials={initialsOf(user?.name ?? "?")}
            seed={user?.name}
            src={user?.avatar_url}
            alt={user?.name}
            size="md"
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-text-primary">{user?.name}</span>
            <span className="block truncate text-[11px] text-text-muted">{user?.email}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SidebarProjects() {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const navigate = useNavigate();
  const projectsQuery = useProjects(activeWorkspaceId);

  return (
    <>
      {(projectsQuery.data ?? []).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(projectUrl(p))}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-secondary hover:text-text-primary"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: p.color }}
            aria-hidden="true"
          />
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </>
  );
}

export function Sidebar() {
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);

  return (
    <>
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute top-0 left-0 h-full w-[260px] border-r border-border bg-surface shadow-popover">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
