import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { initialsOf } from "@/lib/constants";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";
import { qk, useNotifications } from "@/hooks/queries";
import { notificationService } from "@/services/notifications";
import { firstErrorMessage } from "@/services/api";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";

function Breadcrumb() {
  const { projectSlug } = useParams();
  const location = useLocation();

  const crumbs: { label: string; to?: string }[] = [{ label: "Home", to: "/dashboard" }];
  if (projectSlug) {
    crumbs.push({ label: "Project", to: `/projects/${projectSlug}/board` });
    const view = location.pathname.split("/")[3];
    if (view) crumbs.push({ label: view.charAt(0).toUpperCase() + view.slice(1) });
  } else if (location.pathname === "/dashboard") {
    crumbs.push({ label: "Overview" });
  } else if (location.pathname === "/my-tasks") {
    crumbs.push({ label: "My Tasks" });
  } else if (location.pathname === "/inbox") {
    crumbs.push({ label: "Inbox" });
  }

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-[13px]">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-text-muted">/</span>}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={c.to} className="truncate text-text-secondary transition-colors hover:text-text-primary">
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-text-primary">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Wire-desk masthead clock: real Jakarta time, mono, ticking. */
function WibClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <time
      className="font-mono hidden items-center gap-2 border-l border-border pl-3 text-[11px] tabular-nums text-text-muted xl:flex"
      aria-label="Current time in Jakarta"
    >
      {now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false })} WIB
    </time>
  );
}

export function Topbar() {
  const { setSidebarOpen, setCommandOpen, theme, toggleTheme, activeWorkspaceId } = useUi();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const notificationsKey = qk.notifications(activeWorkspaceId);
  const notificationsQuery = useNotifications();
  const notifications = notificationsQuery.data?.items.data ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: notificationsKey });
      const prev = qc.getQueryData(notificationsKey);
      qc.setQueryData(notificationsKey, (old: typeof notificationsQuery.data) =>
        old
          ? {
              ...old,
              items: {
                ...old.items,
                data: old.items.data.map((n) =>
                  n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
                ),
              },
            }
          : old,
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationsKey, ctx.prev);
      toast("error", firstErrorMessage(err));
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(activeWorkspaceId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsKey });
      const prev = qc.getQueryData(notificationsKey);
      qc.setQueryData(notificationsKey, (old: typeof notificationsQuery.data) =>
        old
          ? {
              ...old,
              unread: 0,
              items: {
                ...old.items,
                data: old.items.data.map((n) => ({
                  ...n,
                  read_at: n.read_at ?? new Date().toISOString(),
                })),
              },
            }
          : old,
      );
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationsKey, ctx.prev);
      toast("error", firstErrorMessage(err));
    },
  });

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="cursor-pointer rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary lg:hidden"
        >
          <Menu size={18} />
        </button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-8 w-56 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px] text-text-muted transition-colors duration-150 hover:border-border-strong md:flex xl:w-72"
          aria-label="Search anything"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search anything</span>
          <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px]">/</kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setCommandOpen(true)}>
          <Search size={17} />
        </Button>
        <WibClock />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Dropdown
          align="right"
          width="w-80"
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell size={17} />
              {unread > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
                  aria-hidden="true"
                />
              )}
            </Button>
          }
        >
          {(close) => (
            <>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Notifications</span>
                {unread > 0 && <span className="text-[11px] text-accent">{unread} new</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead.mutate(n.id);
                      close();
                      if (n.link) navigate(n.link);
                      else navigate("/inbox");
                    }}
                    className={`block w-full cursor-pointer rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-secondary ${
                      !n.read_at ? "bg-accent-soft/50" : ""
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      {!n.read_at ? (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      ) : (
                        <span className="w-1.5 shrink-0" />
                      )}
                      <span className="text-[13px] leading-snug text-text-primary">
                        {n.actor?.name && (
                          <strong className="font-medium">{n.actor.name} </strong>
                        )}
                        {n.body}
                      </span>
                    </span>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <p className="px-3 py-6 text-center text-[13px] text-text-muted">
                    You&rsquo;re all caught up.
                  </p>
                )}
              </div>
              <div className="mt-1 border-t border-border px-2 pt-1.5 pb-1">
                <DropdownItem onSelect={() => markAllRead.mutate()}>Mark all as read</DropdownItem>
              </div>
            </>
          )}
        </Dropdown>

        <Dropdown
          align="right"
          trigger={
            <button type="button" className="ml-1 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-accent" aria-label="Account menu">
              <Avatar initials={initialsOf(user?.name ?? "?")} seed={user?.name} src={user?.avatar_url} alt={user?.name} size="md" presence="online" />
            </button>
          }
        >
          {(close) => (
            <>
              <div className="px-2 py-1.5">
                <p className="text-[13px] font-medium text-text-primary">{user?.name}</p>
                <p className="text-[11px] text-text-muted">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <DropdownItem onSelect={() => { close(); navigate("/settings/profile"); }}>
                Profile settings
              </DropdownItem>
              <DropdownItem danger onSelect={() => { close(); void handleLogout(); }}>
                Log out
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
