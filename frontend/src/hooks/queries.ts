import {
  useQuery,
  useQueries,
  type UseQueryResult,
} from "@tanstack/react-query";
import { workspaceService, projectService } from "@/services/workspaces";
import { taskService, commentService, activityService } from "@/services/tasks";
import { invitationService, notificationService, searchService } from "@/services/notifications";
import { api } from "@/services/api";
import { useUi } from "@/stores/ui";
import type { AppNotification, Label, Paginated, SearchResult, Task } from "@/types";

export const qk = {
  workspaces: ["workspaces"] as const,
  workspace: (id: number | null) => ["workspace", id] as const,
  projects: (workspaceId: number | null) => ["projects", workspaceId] as const,
  project: (id: number | string | null) => ["project", id] as const,
  tasks: (projectId: number | string | null) => ["tasks", projectId] as const,
  comments: (taskId: number | null) => ["comments", taskId] as const,
  activities: (projectId: number | string | null) => ["activities", projectId] as const,
  notifications: (workspaceId: number | null) => ["notifications", workspaceId] as const,
  search: (q: string) => ["search", q] as const,
  labels: (workspaceId: number | null) => ["labels", workspaceId] as const,
  myInvitations: ["my-invitations"] as const,
  workspaceInvitations: (workspaceId: number | null) => ["workspace-invitations", workspaceId] as const,
};

export function useMyInvitations() {
  return useQuery({
    queryKey: qk.myInvitations,
    queryFn: () => invitationService.mine(),
    staleTime: 30_000,
  });
}

export function useWorkspaceInvitations(workspaceId: number | null) {
  return useQuery({
    queryKey: qk.workspaceInvitations(workspaceId),
    queryFn: () => invitationService.forWorkspace(workspaceId!),
    enabled: workspaceId != null,
    staleTime: 30_000,
  });
}

export function useLabels(workspaceId: number | null) {
  return useQuery({
    queryKey: qk.labels(workspaceId),
    queryFn: () => api<Label[]>(`/workspaces/${workspaceId}/labels`),
    enabled: workspaceId != null,
    staleTime: 60_000,
  });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: qk.workspaces,
    queryFn: () => workspaceService.list(),
    staleTime: 60_000,
  });
}

export function useWorkspace(id: number | null) {
  return useQuery({
    queryKey: qk.workspace(id),
    queryFn: () => workspaceService.get(id!),
    enabled: id != null,
  });
}

export function useProjects(workspaceId: number | null) {
  return useQuery({
    queryKey: qk.projects(workspaceId),
    queryFn: () => projectService.listByWorkspace(workspaceId!),
    enabled: workspaceId != null,
    staleTime: 30_000,
  });
}

export function useProject(id: number | string | null) {
  return useQuery({
    queryKey: qk.project(id),
    queryFn: () => projectService.get(id!),
    enabled: id != null && id !== "",
  });
}

export function useTasks(projectId: number | string | null): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: qk.tasks(projectId),
    queryFn: () => taskService.listByProject(projectId!),
    enabled: projectId != null && projectId !== "",
    staleTime: 10_000,
  });
}

/** Fetch tasks for every project in a workspace (dashboard / my-tasks views). */
export function useWorkspaceTasks(projectIds: number[] | undefined) {
  return useQueries({
    queries:
      projectIds?.map((id) => ({
        queryKey: qk.tasks(id),
        queryFn: () => taskService.listByProject(id),
        staleTime: 10_000,
      })) ?? [],
    combine: (results) => {
      const tasks = results.flatMap((r) => r.data ?? []);
      const isLoading = results.some((r) => r.isPending);
      return { tasks, isLoading };
    },
  }) satisfies { tasks: Task[]; isLoading: boolean };
}

export function useComments(taskId: number | null) {
  return useQuery({
    // Unwrap the paginated payload here so the cache holds a plain Comment[].
    // Realtime handlers and the reaction optimistic update all assume an array.
    queryKey: qk.comments(taskId),
    queryFn: () => commentService.listByTask(taskId!).then((page) => page.data),
    enabled: taskId != null,
  });
}

export function useActivities(projectId: number | string | null) {
  return useQuery({
    queryKey: qk.activities(projectId),
    queryFn: () => activityService.listByProject(projectId!),
    enabled: projectId != null && projectId !== "",
    staleTime: 15_000,
  });
}

export function useNotifications(): UseQueryResult<{
  unread: number;
  items: Paginated<AppNotification>;
}> {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  return useQuery({
    queryKey: qk.notifications(activeWorkspaceId),
    queryFn: () => notificationService.list(activeWorkspaceId),
    staleTime: 20_000,
  });
}

export function useSearch(q: string) {
  return useQuery<SearchResult>({
    queryKey: qk.search(q),
    queryFn: () => searchService.global(q),
    enabled: q.trim().length > 1,
    placeholderData: (prev) => prev,
  });
}
