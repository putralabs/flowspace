import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  projectChannel,
  userChannel,
  workspacePresenceChannel,
  getEcho,
  type EchoChannel,
} from "./echo";
import { api } from "@/services/api";
import { useRealtime } from "@/stores/realtime";
import type { Comment, Task, WorkspaceMember } from "@/types";

type Handler<T> = (payload: T) => void;

function on<T>(channel: EchoChannel, event: string, handler: Handler<T>) {
  channel.listen(event, handler as (payload: never) => void);
}

function upsertTask(qc: QueryClient, projectId: number, incoming: Partial<Task> & { id: number }) {
  qc.setQueryData<Task[]>(["tasks", projectId], (old) => {
    if (!old) return old;
    if (!old.some((t) => t.id === incoming.id)) return old;
    return old.map((t) => (t.id === incoming.id ? { ...t, ...incoming } : t));
  });
}

/** Subscribe to one project's private channel. Returns cleanup. */
export function bindProjectChannel(qc: QueryClient, projectId: number): () => void {
  const channel = projectChannel(projectId);
  const pruneTyping = useRealtime.getState().pruneTyping;

  on<{ task: Partial<Task> & { id: number } }>(channel, ".TaskCreated", (e) => {
    qc.setQueryData<Task[]>(["tasks", projectId], (old) =>
      old?.some((t) => t.id === e.task.id)
        ? old.map((t) => (t.id === e.task.id ? { ...t, ...e.task } : t))
        : [...(old ?? []), e.task as Task],
    );
    void qc.invalidateQueries({ queryKey: ["activities", projectId] });
  });

  on<{ task: Partial<Task> & { id: number } }>(channel, ".TaskUpdated", (e) =>
    upsertTask(qc, projectId, e.task),
  );

  on<{ task: Partial<Task> & { id: number } }>(channel, ".TaskMoved", (e) =>
    upsertTask(qc, projectId, e.task),
  );

  on<{ task: { id: number } }>(channel, ".TaskDeleted", (e) => {
    qc.setQueryData<Task[]>(["tasks", projectId], (old) =>
      old?.filter((t) => t.id !== e.task.id),
    );
  });

  on<{ task: Partial<Task> & { id: number; assignee_id?: number | null } }>(
    channel,
    ".TaskAssigned",
    (e) => upsertTask(qc, projectId, e.task),
  );

  on<{
    comment: Pick<Comment, "id" | "task_id" | "user_id" | "parent_id" | "body">;
    user: { id: number; name: string };
  }>(channel, ".CommentCreated", (e) => {
    qc.setQueryData<Comment[]>(["comments", e.comment.task_id], (old) => {
      if (!old || old.some((c) => c.id === e.comment.id)) return old;
      return [
        ...old,
        {
          ...e.comment,
          created_at: new Date().toISOString(),
          user: e.user,
        },
      ];
    });
    void qc.invalidateQueries({ queryKey: ["activities", projectId] });
  });

  on<{
    comment_id: number;
    task_id: number;
    body?: string;
    reactions?: { emoji: string; count: number }[];
  }>(channel, ".CommentUpdated", (e) => {
    qc.setQueryData<Comment[]>(["comments", e.task_id], (old) =>
      old?.map((c) =>
        c.id === e.comment_id
          ? {
              ...c,
              body: e.body ?? c.body,
              reactions: e.reactions
                ? e.reactions.map((r) => ({ emoji: r.emoji, count: Number(r.count) }))
                : c.reactions,
            }
          : c,
      ),
    );
  });

  on<{ comment_id: number; task_id: number }>(channel, ".CommentDeleted", (e) => {
    qc.setQueryData<Comment[]>(["comments", e.task_id], (old) =>
      old?.filter((c) => c.id !== e.comment_id),
    );
  });

  on<{ user: { id: number; name: string }; task_id: number | null }>(
    channel,
    ".TypingStarted",
    (e) => {
      useRealtime.getState().markTyping({
        userId: e.user.id,
        userName: e.user.name,
        taskId: e.task_id,
      });
    },
  );

  on<{ user: { id: number }; task_id: number | null }>(channel, ".TypingStopped", (e) => {
    useRealtime.getState().removeTyping(e.user.id, e.task_id);
  });

  on<{ task_id: number }>(channel, ".AttachmentCreated", (e) => {
    void qc.invalidateQueries({ queryKey: ["attachments", e.task_id] });
  });

  on<{ task_id: number }>(channel, ".AttachmentDeleted", (e) => {
    void qc.invalidateQueries({ queryKey: ["attachments", e.task_id] });
  });

  const typingTimer = window.setInterval(pruneTyping, 1500);

  return () => {
    window.clearInterval(typingTimer);
    getEcho().leave(`project.${projectId}`);
  };
}

/** Subscribe to presence + workspace + private user channels. Returns cleanup. */
export function bindGlobalChannels(
  qc: QueryClient,
  userId: number,
  workspaceId: number,
): () => void {
  const presence = workspacePresenceChannel(workspaceId);
  presence.here((users) => useRealtime.getState().setOnline(users.map((u) => u.id)));
  presence.joining((user) => useRealtime.getState().addOnline(user.id));
  presence.leaving((user) => useRealtime.getState().removeOnline(user.id));

  const workspaceChannel = getEcho().private(`workspace.${workspaceId}`) as unknown as EchoChannel;

  on<{ user: { id: number; name: string }; role: string }>(
    workspaceChannel,
    ".MemberJoined",
    (e) => {
      if (e.user.id === userId) {
        void qc.invalidateQueries({ queryKey: ["workspaces"] });
        void qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
        void qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
        return;
      }
      qc.setQueryData<{ workspace: unknown; my_role: string; members: WorkspaceMember[] }>(
        ["workspace", workspaceId],
        (old) =>
          old
            ? {
                ...old,
                members: [
                  ...old.members.filter((m) => m.id !== e.user.id),
                  {
                    id: e.user.id,
                    name: e.user.name,
                    email: "",
                    role: (e.role as WorkspaceMember["role"]) ?? "member",
                  },
                ],
              }
            : old,
      );
    },
  );

  on<{ user: { id: number; name: string } }>(workspaceChannel, ".MemberLeft", (e) => {
    qc.setQueryData<{ workspace: unknown; my_role: string; members: WorkspaceMember[] }>(
      ["workspace", workspaceId],
      (old) =>
        old ? { ...old, members: old.members.filter((m) => m.id !== e.user.id) } : old,
    );
    void qc.invalidateQueries({ queryKey: ["workspaces"] });
  });

  on<{ user: { id: number; name: string } }>(workspaceChannel, ".MemberOnline", (e) => {
    useRealtime.getState().addOnline(e.user.id);
  });

  on<{ user: { id: number; name: string } }>(workspaceChannel, ".MemberOffline", (e) => {
    useRealtime.getState().removeOnline(e.user.id);
  });

  on<{ body: string; link: string | null }>(userChannel(userId), ".NotificationCreated", () => {
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  });

  // Presence heartbeat keeps last_seen_at fresh server-side.
  const heartbeat = window.setInterval(() => {
    void api("/presence/heartbeat", { method: "POST" }).catch(() => undefined);
  }, 45_000);

  return () => {
    window.clearInterval(heartbeat);
    getEcho().leave(`workspace.${workspaceId}.presence`);
    getEcho().leave(`workspace.${workspaceId}`);
    getEcho().leave(`user.${userId}`);
  };
}

/** React hook version used once inside App. */
export function useRealtimeBindings(userId: number | null, workspaceId: number | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId || !workspaceId) return;
    return bindGlobalChannels(qc, userId, workspaceId);
  }, [qc, userId, workspaceId]);
}

/** Subscribe to one project's channel (comments, tasks, typing, attachments). */
export function useProjectChannel(projectId: number | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    return bindProjectChannel(qc, projectId);
  }, [qc, projectId]);
}
