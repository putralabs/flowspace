import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications";
import { firstErrorMessage } from "@/services/api";
import { qk, useNotifications } from "@/hooks/queries";
import { initialsOf } from "@/lib/constants";
import { useRealtime } from "@/stores/realtime";
import { useUi } from "@/stores/ui";
import type { AppNotification } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

export function InboxPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const onlineUserIds = useRealtime((s) => s.onlineUserIds);
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);

  const notificationsQuery = useNotifications();
  const notifications: AppNotification[] = notificationsQuery.data?.items.data ?? [];

  const list = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.notifications(activeWorkspaceId) });
      const prev = qc.getQueryData(qk.notifications(activeWorkspaceId));
      qc.setQueryData(qk.notifications(activeWorkspaceId), (old: typeof notificationsQuery.data) =>
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
      if (ctx?.prev) qc.setQueryData(qk.notifications(activeWorkspaceId), ctx.prev);
      toast("error", firstErrorMessage(err));
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(activeWorkspaceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.notifications(activeWorkspaceId) }),
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  function openNotification(n: AppNotification) {
    if (!n.read_at) markReadMutation.mutate(n.id);
    navigate(n.link ?? "/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header className="flex items-center justify-between border-b border-border-strong pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">
            Inbox
            {unreadCount > 0 && (
              <span className="font-mono ml-2.5 align-middle text-[12px] font-medium tabular-nums text-accent">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Mentions, assignments, and updates that involve you.
          </p>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {(["all", "unread"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors duration-150",
                filter === f ? "bg-surface-secondary text-text-primary" : "text-text-muted hover:text-text-primary",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {notificationsQuery.isPending ? (
        <ul className="divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-1 py-3.5">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openNotification(n)}
                className={cn(
                  "group grid w-full cursor-pointer grid-cols-[auto_auto_1fr_auto] items-baseline gap-x-3 px-1 py-3 text-left transition-colors duration-100 hover:bg-surface-secondary/50",
                  !n.read_at && "bg-surface",
                )}
              >
                {!n.read_at ? (
                  <span className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-accent" aria-label="Unread" />
                ) : (
                  <span className="w-1.5 shrink-0" />
                )}
                <Avatar
                  initials={initialsOf(n.actor?.name ?? "?")}
                  seed={n.actor?.name}
                  src={n.actor?.avatar_url}
                  alt={n.actor?.name}
                  size="sm"
                  presence={n.actor && onlineUserIds[n.actor.id] ? "online" : undefined}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug text-text-secondary">
                    {n.actor?.name && (
                      <strong className="font-medium text-text-primary">{n.actor.name} </strong>
                    )}
                    {n.body}
                  </span>
                </span>
                <span className="flex items-baseline gap-3">
                  <time className="font-mono hidden text-[10px] tabular-nums text-text-muted sm:block">
                    {new Date(n.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                  {!n.read_at && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(n.id);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && markReadMutation.mutate(n.id)}
                      className="invisible shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium text-accent group-hover:visible hover:underline"
                    >
                      Mark read
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-16 text-center">
              <p className="text-sm font-medium text-text-primary">
                {filter === "unread" ? "No unread notifications" : "Inbox zero"}
              </p>
              <p className="mt-1 text-[13px] text-text-muted">New activity will show up here.</p>
            </li>
          )}
        </ul>
      )}

      {unreadCount > 0 && (
        <footer className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => markAllMutation.mutate()}>
            Mark all as read ({unreadCount})
          </Button>
        </footer>
      )}
    </div>
  );
}
