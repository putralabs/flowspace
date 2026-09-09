import { api, buildQuery } from "./api";
import type { AppNotification, InvitationPreview, Paginated, PendingInvitation, SearchResult } from "@/types";

export const notificationService = {
  list: (workspaceId?: number | null) =>
    api<{ unread: number; items: Paginated<AppNotification> }>(
      `/notifications${buildQuery({ workspace_id: workspaceId ?? undefined })}`,
    ),

  markRead: (id: number) => api<AppNotification>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: (workspaceId?: number | null) =>
    api<{ message: string }>(
      `/notifications/read-all${buildQuery({ workspace_id: workspaceId ?? undefined })}`,
      { method: "POST" },
    ),

  remove: (id: number) => api<void>(`/notifications/${id}`, { method: "DELETE" }),
};

export const searchService = {
  global: (q: string) => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
};

/** Invitations: pending lists, preview/accept/decline by token, revoke by manager. */
export const invitationService = {
  mine: () => api<PendingInvitation[]>(`/invitations/pending`),

  forWorkspace: (workspaceId: number) =>
    api<PendingInvitation[]>(`/workspaces/${workspaceId}/invitations`),

  preview: (token: string) => api<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`),

  accept: (token: string) =>
    api<{ message: string; workspace: { id: number; name: string } }>(
      `/invitations/${encodeURIComponent(token)}/accept`,
      { method: "POST" },
    ),

  decline: (token: string) =>
    api<{ message: string }>(`/invitations/${encodeURIComponent(token)}/decline`, {
      method: "POST",
    }),

  revoke: (workspaceId: number, invitationId: number) =>
    api<{ message: string }>(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: "DELETE",
    }),
};
