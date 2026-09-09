import type { Priority, TaskStatus } from "@/types";

export const statusOrder: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];

export const statusMeta: Record<TaskStatus, { label: string }> = {
  backlog: { label: "Backlog" },
  todo: { label: "Todo" },
  in_progress: { label: "In Progress" },
  review: { label: "Review" },
  done: { label: "Done" },
};

export const priorityMeta: Record<Priority, { label: string; rank: number }> = {
  none: { label: "No priority", rank: 0 },
  low: { label: "Low", rank: 1 },
  medium: { label: "Medium", rank: 2 },
  high: { label: "High", rank: 3 },
  urgent: { label: "Urgent", rank: 4 },
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "project"
  );
}

/** Canonical project URL: /projects/<slug>/board, falling back to ID for legacy data. */
export function projectUrl(p: { id: number; slug?: string | null; name?: string }, view = "board"): string {
  const slug = p.slug?.trim() || (p.name ? slugify(p.name) : "") || String(p.id);
  return `/projects/${slug}/${view}`;
}

/** Resolve a task's project link when only the ID is known (dashboard/my-tasks). */
export function projectUrlById(
  projects: { id: number; slug?: string | null; name?: string }[],
  projectId: number,
  view = "board",
): string {
  const found = projects.find((p) => p.id === projectId);
  if (found) return projectUrl(found, view);
  return `/projects/${projectId}/${view}`;
}
