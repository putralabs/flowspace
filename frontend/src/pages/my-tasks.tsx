import { Link } from "react-router-dom";
import { useUi } from "@/stores/ui";
import { useAuth } from "@/stores/auth";
import { useProjects, useWorkspaceTasks } from "@/hooks/queries";
import { StatusIcon, PriorityIcon } from "@/components/task/meta";
import { Skeleton } from "@/components/ui/skeleton";
import { projectUrlById } from "@/lib/constants";
import { cn } from "@/lib/utils";

const groups = [
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "todo", label: "Todo" },
  { key: "backlog", label: "Backlog" },
  { key: "done", label: "Completed" },
] as const;

function shortDate(due: string) {
  return new Date(`${due}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MyTasksPage() {
  const user = useAuth((s) => s.user);
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const projectsQuery = useProjects(activeWorkspaceId);
  const projects = projectsQuery.data ?? [];
  const { tasks, isLoading } = useWorkspaceTasks(
    activeWorkspaceId ? projects.map((p) => p.id) : undefined,
  );
  const mine = tasks.filter((t) => t.assignee_id === user?.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header className="border-b border-border-strong pb-4">
        <h1 className="text-page-title text-text-primary">
          My Tasks
          <span className="font-mono ml-2.5 align-middle text-[12px] font-medium tabular-nums text-text-muted">
            {mine.filter((t) => t.status !== "done").length} open
          </span>
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Everything assigned to you across all projects.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => {
            const groupTasks = mine.filter((t) => t.status === g.key);
            if (groupTasks.length === 0 && g.key !== "done") return null;
            return (
              <section key={g.key} aria-label={g.label}>
                <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
                  <h2 className="text-[13px] font-semibold text-text-primary">{g.label}</h2>
                  <span className="font-mono text-[11px] tabular-nums text-text-muted">
                    {groupTasks.length}
                  </span>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                  {groupTasks.map((t) => {
                    const project = projects.find((p) => p.id === t.project_id);
                    return (
                      <li key={t.id}>
                        <Link
                          to={projectUrlById(projects, t.project_id)}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-surface-secondary/50"
                        >
                          <StatusIcon status={t.status} />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-[13px] font-medium", t.status === "done" ? "text-text-muted line-through" : "text-text-primary")}>
                              {t.title}
                            </span>
                            <span className="block truncate text-xs text-text-secondary">
                              {project?.name ?? "Project"}
                            </span>
                          </span>
                          <PriorityIcon priority={t.priority} />
                          {t.due_date && (
                            <span className="font-mono hidden w-16 text-right text-[11px] tabular-nums text-text-secondary sm:block">
                              {shortDate(t.due_date)}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                  {groupTasks.length === 0 && (
                    <li className="px-4 py-3 text-[13px] text-text-muted">Nothing here.</li>
                  )}
                </ul>
              </section>
            );
          })}

          <section aria-label="Workload summary" className="border-y border-border py-3">
            <dl className="font-mono flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[12px] tabular-nums">
              {[
                ["Open", mine.filter((t) => t.status !== "done").length],
                ["With due date", mine.filter((t) => t.due_date).length],
                ["In review", mine.filter((t) => t.status === "review").length],
                ["Done", mine.filter((t) => t.status === "done").length],
              ].map(([label, value], i) => (
                <span key={String(label)} className="flex items-baseline gap-2">
                  {i > 0 && <span className="mr-4 text-border-strong" aria-hidden="true">·</span>}
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="font-semibold text-text-primary">{value}</dd>
                </span>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
