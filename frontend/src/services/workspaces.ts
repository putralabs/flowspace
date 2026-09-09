import { api } from "./api";
import type { Project, Workspace, WorkspaceMember, WorkspaceRole } from "@/types";

export const workspaceService = {
  list: () => api<Workspace[]>("/workspaces"),

  get: (id: number) =>
    api<{ workspace: Workspace; my_role: WorkspaceRole; members: WorkspaceMember[]; projects_count: number }>(
      `/workspaces/${id}`,
    ),

  create: (input: { name: string; description?: string }) =>
    api<Workspace>("/workspaces", { method: "POST", json: input }),

  update: (id: number, input: { name?: string; description?: string | null }) =>
    api<Workspace>(`/workspaces/${id}`, { method: "PUT", json: input }),

  remove: (id: number) => api<void>(`/workspaces/${id}`, { method: "DELETE" }),

  inviteMember: (id: number, input: { email: string; role: WorkspaceRole }) =>
    api<{ message: string; invited_existing: boolean }>(`/workspaces/${id}/members`, {
      method: "POST",
      json: input,
    }),

  updateMemberRole: (workspaceId: number, memberId: number, role: WorkspaceRole) =>
    api<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}/role`, {
      method: "PUT",
      json: { role },
    }),

  removeMember: (workspaceId: number, memberId: number) =>
    api<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" }),
};

export type ProjectKey = number | string;

export const projectService = {
  listByWorkspace: (workspaceId: number) => api<Project[]>(`/workspaces/${workspaceId}/projects`),

  get: (id: ProjectKey) =>
    api<{ project: Project; my_role: WorkspaceRole; members: Pick<WorkspaceMember, "id" | "name" | "avatar_url">[] }>(
      `/projects/${id}`,
    ),

  create: (
    workspaceId: number,
    input: {
      name: string;
      description?: string;
      color?: string;
      status?: string;
      start_date?: string | null;
      due_date?: string | null;
    },
  ) => api<Project>(`/workspaces/${workspaceId}/projects`, { method: "POST", json: input }),

  update: (id: ProjectKey, input: Partial<{ name: string; description: string; color: string; due_date: string | null }>) =>
    api<Project>(`/projects/${id}`, { method: "PUT", json: input }),

  remove: (id: ProjectKey) => api<{ message: string }>(`/projects/${id}`, { method: "DELETE" }),

  addMember: (projectId: ProjectKey, userId: number, role?: string) =>
    api<{ message: string }>(`/projects/${projectId}/members`, {
      method: "POST",
      json: { user_id: userId, ...(role ? { role } : {}) },
    }),

  removeMember: (projectId: ProjectKey, memberId: number) =>
    api<{ message: string }>(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" }),

  typing: (projectId: ProjectKey, taskId: number | null = null) =>
    api<void>(`/projects/${projectId}/typing`, { method: "POST", json: { task_id: taskId } }),
};
