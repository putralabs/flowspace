import { api, buildQuery, getToken, apiUrl } from "./api";
import type { ActivityItem, Attachment, Comment, Paginated, Task, TaskStatus } from "@/types";

export const taskService = {
  listByProject: (projectId: number | string, filters: { status?: TaskStatus; assignee_id?: number } = {}) =>
    api<Task[]>(`/projects/${projectId}/tasks${buildQuery(filters)}`),

  get: (id: number) => api<Task>(`/tasks/${id}`),

  create: (
    projectId: number | string,
    input: {
      title: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: Task["priority"];
      assignee_id?: number | null;
      due_date?: string | null;
      label_ids?: number[];
    },
  ) => api<Task>(`/projects/${projectId}/tasks`, { method: "POST", json: input }),

  update: (id: number, input: Partial<Task> & { label_ids?: number[] }) =>
    api<Task>(`/tasks/${id}`, { method: "PUT", json: input }),

  move: (id: number, input: { status: TaskStatus; position: number }) =>
    api<Task>(`/tasks/${id}/move`, { method: "PATCH", json: input }),

  remove: (id: number) => api<void>(`/tasks/${id}`, { method: "DELETE" }),
};

export const commentService = {
  listByTask: (taskId: number) => api<Paginated<Comment>>(`/tasks/${taskId}/comments`),

  create: (taskId: number, input: { body: string; parent_id?: number | null }) =>
    api<Comment>(`/tasks/${taskId}/comments`, { method: "POST", json: input }),

  update: (commentId: number, body: string) =>
    api<Comment>(`/comments/${commentId}`, { method: "PUT", json: { body } }),

  remove: (commentId: number) => api<void>(`/comments/${commentId}`, { method: "DELETE" }),
};

export const activityService = {
  listByProject: (projectId: number | string) => api<ActivityItem[]>(`/projects/${projectId}/activities`),
};

export const attachmentService = {
  listByTask: (taskId: number) => api<Attachment[]>(`/tasks/${taskId}/attachments`),

  upload: (taskId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<Attachment>(`/tasks/${taskId}/attachments`, {
      method: "POST",
      body: form,
    });
  },

  remove: (attachmentId: number) =>
    api<void>(`/attachments/${attachmentId}`, { method: "DELETE" }),

  /** Download with auth header; returns a blob the caller can save. */
  download: async (attachmentId: number): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(apiUrl(`/attachments/${attachmentId}/download`), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Gagal mengunduh file.");
    const disposition = res.headers.get("content-disposition") ?? "";
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    return {
      blob: await res.blob(),
      filename: match ? decodeURIComponent(match[1]) : `file-${attachmentId}`,
    };
  },

  saveBlob: (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
