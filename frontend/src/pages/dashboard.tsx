import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useUi } from "@/stores/ui";
import { useAuth } from "@/stores/auth";
import { useRealtime } from "@/stores/realtime";
import {
  useActivities,
  useProjects,
  useWorkspaceTasks,
} from "@/hooks/queries";
import { StatusIcon, PriorityIcon } from "@/components/task/meta";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { projectUrl, projectUrlById } from "@/lib/constants";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Section heading as a ruled ledger row: Franklin title left, mono count right. */
function SectionHeading({
  title,
  count,
  action,
}: {
  title: string;
  count?: number | string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-border-strong pb-2">
      <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-text-primary">
        {title}
        {count !== undefined && (
          <span className="font-mono text-[11px] font-medium tabular-nums text-text-muted">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const onlineUserIds = useRealtime((s) => s.onlineUserIds);

  const projectsQuery = useProjects(activeWorkspaceId);
  const projects = projectsQuery.data ?? [];

  const feedProjectId = projects[0]?.id ?? null;
  const activitiesQuery = useActivities(feedProjectId);

  const tasksCombined = useWorkspaceTasks(
    activeWorkspaceId ? projects.map((p) => p.id) : undefined,
  );
  const tasks = tasksCombined.tasks;

  const myOpen = tasks.filter((t) => t.assignee_id === user?.id && t.status !== "done");
  const myTasks = myOpen.slice(0, 5);
  const dueSoon = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 4);
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "planned" || p.status === "on_hold",
  );
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const inProgressCount = tasks.filter(
    (t) => t.assignee_id === user?.id && t.status === "in_progress",
  ).length;
  const inReviewCount = tasks.filter(
    (t) => t.assignee_id === user?.id && t.status === "review",
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header>
        <h1 className="text-display text-text-primary">
          {greeting()}, {user?.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
          <span>
            You have {myOpen.length} open task{myOpen.length === 1 ? "" : "s"}.
          </span>
          <span className="font-mono hidden items-center gap-3 text-[11px] tabular-nums text-text-muted sm:flex">
            <span>{inProgressCount} in progress</span>
            <span aria-hidden="true">·</span>
            <span>{inReviewCount} in review</span>
            <span aria-hidden="true">·</span>
            <span>{completedCount} done</span>
            {Object.keys(onlineUserIds).length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{Object.keys(onlineUserIds).length} online</span>
              </>
            )}
          </span>
        </p>
      </header>

      <section className="mt-8" aria-labelledby="your-work">
        <span id="your-work" className="sr-only">Your work</span>
        <SectionHeading
          title="Your work"
          count={myOpen.length}
          action={
            <Link to="/my-tasks" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          }
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">
              My tasks
            </h3>
            {tasksCombined.isLoading ? (
              <div className="space-y-2 py-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {myTasks.map((t) => {
                  const project = projects.find((p) => p.id === t.project_id);
                  return (
                    <li key={t.id}>
                      <Link
                        to={projectUrlById(projects, t.project_id)}
                        className="flex items-center gap-2.5 py-2 transition-colors hover:bg-surface-secondary/50"
                      >
                        <StatusIcon status={t.status} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{t.title}</span>
                        {t.due_date && (
                          <span className="font-mono hidden shrink-0 text-[10px] tabular-nums text-text-muted sm:block">
                            {new Date(`${t.due_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="hidden shrink-0 text-xs text-text-secondary md:block">{project?.name}</span>
                      </Link>
                    </li>
                  );
                })}
                {myTasks.length === 0 && (
                  <li className="py-3 text-[13px] text-text-muted">No open tasks. Enjoy the calm.</li>
                )}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">
              Due soon
            </h3>
            <ul className="divide-y divide-border">
              {dueSoon.map((t) => (
                <li key={t.id}>
                  <Link
                    to={projectUrlById(projects, t.project_id)}
                    className="flex items-center gap-2.5 py-2 transition-colors hover:bg-surface-secondary/50"
                  >
                    <PriorityIcon priority={t.priority} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{t.title}</span>
                    <span className="font-mono shrink-0 text-[10px] tabular-nums text-text-secondary">
                      {new Date(`${t.due_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
              {!tasksCombined.isLoading && dueSoon.length === 0 && (
                <li className="py-3 text-[13px] text-text-muted">Nothing due right now.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-label="Projects">
        <SectionHeading
          title="Projects"
          count={activeProjects.length}
          action={
            <Link to="/projects" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              All projects <ArrowUpRight size={13} />
            </Link>
          }
        />
        {projectsQuery.isLoading ? (
          <div className="space-y-3 py-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activeProjects.map((p) => (
              <li key={p.id}>
                <Link to={projectUrl(p)} className="group flex items-center gap-4 py-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                    style={{ backgroundColor: `color-mix(in srgb, ${p.color} 14%, transparent)`, color: p.color }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text-primary group-hover:text-accent">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-text-muted">{p.description}</span>
                  </span>
                  <span className="font-mono shrink-0 text-[11px] tabular-nums text-text-muted">
                    {p.tasks_count ?? 0} tasks
                  </span>
                </Link>
              </li>
            ))}
            {activeProjects.length === 0 && !projectsQuery.isLoading && (
              <li className="py-3 text-[13px] text-text-muted">No active projects yet.</li>
            )}
          </ul>
        )}
      </section>

      <section className="mt-10 pb-6" aria-label="Recent activity">
        <SectionHeading title="Recent activity" />
        {activitiesQuery.isLoading ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {(activitiesQuery.data ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 py-2">
                <time className="font-mono shrink-0 text-[10px] tabular-nums text-text-muted">
                  {new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </time>
                <p className="min-w-0 text-[13px] leading-snug text-text-secondary">
                  <Avatar initials={(a.actor?.name ?? "?").slice(0, 2).toUpperCase()} seed={a.actor?.name} src={a.actor?.avatar_url} alt={a.actor?.name} size="sm" className="mr-2 inline-block align-middle" />
                  <strong className="font-medium text-text-primary">{a.actor?.name}</strong> {a.action}{" "}
                  <span className="font-medium text-text-primary">{a.target}</span>
                </p>
              </li>
            ))}
            {(activitiesQuery.data ?? []).length === 0 && !activitiesQuery.isLoading && (
              <li className="py-3 text-[13px] text-text-muted">No recent activity.</li>
            )}
          </ol>
        )}
      </section>
    </div>
  );
}
