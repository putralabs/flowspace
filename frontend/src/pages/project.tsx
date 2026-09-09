import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Filter, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/tasks";
import { projectService } from "@/services/workspaces";
import { firstErrorMessage } from "@/services/api";
import { qk, useProject, useTasks } from "@/hooks/queries";
import { useProjectChannel } from "@/websocket/bindings";
import { priorityMeta } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AvatarGroup } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useUi } from "@/stores/ui";
import { KanbanBoard } from "@/features/project/kanban-board";
import { TaskDrawer } from "@/features/task/task-drawer";
import { ListView } from "@/features/project/list-view";
import { CalendarView } from "@/features/project/calendar-view";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list" | "calendar";

const tabs: { key: ViewMode; label: string }[] = [
  { key: "board", label: "Board" },
  { key: "list", label: "List" },
  { key: "calendar", label: "Calendar" },
];

export function ProjectPage() {
  const { projectSlug, view: viewParam } = useParams();
  const navigate = useNavigate();

  const key = projectSlug?.trim() ? projectSlug.trim() : null;
  const projectQuery = useProject(key);

  const canonical = projectQuery.data?.project?.slug;
  useEffect(() => {
    // Redirect legacy /projects/3/board to canonical /projects/nama-project/board.
    if (key && canonical && key !== canonical && /^\d+$/.test(key)) {
      navigate(`/projects/${canonical}/${(viewParam as ViewMode) || "board"}`, { replace: true });
    }
  }, [key, canonical, viewParam, navigate]);

  if (!key) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-semibold text-text-primary">Project not found</p>
        <p className="max-w-xs text-[13px] text-text-secondary">
          This project may have been deleted or you don&rsquo;t have access to it.
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  if (projectQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-semibold text-text-primary">Project not found</p>
        <p className="max-w-xs text-[13px] text-text-secondary">
          This project may have been deleted or you don&rsquo;t have access to it.
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <ProjectView
      key={key}
      projectKey={key}
      initialView={(viewParam as ViewMode) || "board"}
    />
  );
}

function ProjectView({ projectKey, initialView }: { projectKey: string; initialView: ViewMode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const projectQuery = useProject(projectKey);
  // Numeric project id once loaded. Tasks/activities caches key off this so
  // realtime handlers (which only know the numeric id) hit the same entries.
  const numericProjectId = projectQuery.data?.project?.id ?? null;
  const tasksKey = numericProjectId ?? projectKey;
  const tasksQuery = useTasks(tasksKey);
  const allTasks = tasksQuery.data ?? [];

  useProjectChannel(numericProjectId);

  const composerOpen = useUi((s) => s.composerOpen);
  const setComposerOpen = useUi((s) => s.setComposerOpen);
  const [view, setView] = useState<ViewMode>(["board", "list", "calendar"].includes(initialView) ? initialView : "board");
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("manual");
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<TaskStatus>("backlog");
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  function openComposer(status: TaskStatus = "backlog") {
    setNewStatus(status);
    setNewTitle("");
    setComposerOpen(true);
  }

  function notifyError(message: string) {
    toast("error", message);
  }

  /** Optimistic kanban move with rollback (PRD §10/§25). */
  const moveMutation = useMutation({
    mutationFn: (input: { id: number; status: TaskStatus; position: number }) =>
      taskService.move(input.id, { status: input.status, position: input.position }),
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: qk.tasks(tasksKey) });
      const prev = qc.getQueryData<Task[]>(qk.tasks(tasksKey));
      qc.setQueryData<Task[]>(qk.tasks(tasksKey), reorder(prev, id, status, position));
      return { prev };
    },
    onSuccess: (updated) => {
      // Server may renumber siblings; resync quietly.
      qc.setQueryData<Task[]>(qk.tasks(tasksKey), (old) =>
        old?.map((t) => (t.id === updated.id ? { ...t, position: updated.position } : t)),
      );
      void qc.invalidateQueries({ queryKey: qk.tasks(tasksKey) });
      void qc.invalidateQueries({ queryKey: qk.activities(tasksKey) });
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks(tasksKey), ctx.prev);
      notifyError(firstErrorMessage(err));
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: { title: string; status: TaskStatus }) =>
      taskService.create(tasksKey, {
        title: input.title,
        status: input.status,
        priority: "none",
      }),
    onSuccess: () => {
      setNewTitle("");
      setComposerOpen(false);
      toast("success", `Task "${newTitle}" created`);
      void qc.invalidateQueries({ queryKey: qk.tasks(tasksKey) });
    },
    onError: (err) => notifyError(firstErrorMessage(err)),
  });

  // NOTE: defined before any early return to keep hook order stable.
  // Previously this was after `if (projectQuery.isPending) return ...` which
  // crashed React with "Rendered more hooks than during the previous render"
  // and left /projects/:id/board as a blank white screen.
  const deleteMutation = useMutation({
    mutationFn: () => projectService.remove(projectKey),
    onSuccess: () => {
      toast("success", "Project deleted");
      setDeleteOpen(false);
      const activeWorkspaceId = useUi.getState().activeWorkspaceId;
      void qc.invalidateQueries({ queryKey: qk.projects(activeWorkspaceId) });
      navigate("/projects", { replace: true });
    },
    onError: (err) => notifyError(firstErrorMessage(err)),
  });

  const visibleTasks = useMemo(() => {
    let list = allTasks;
    if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (sortBy === "priority") {
      return [...list].sort(
        (a, b) => priorityMeta[b.priority].rank - priorityMeta[a.priority].rank || a.position - b.position,
      );
    }
    if (sortBy === "due") {
      return [...list].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    }
    return list;
  }, [allTasks, query, filterStatus, sortBy]);

  function moveTask(taskId: number, status: TaskStatus, position: number) {
    moveMutation.mutate({ id: taskId, status, position });
  }

  function createTask() {
    const title = newTitle.trim();
    if (!title) return;
    createMutation.mutate({ title, status: newStatus });
  }

  if (projectQuery.isPending) {
    return (
      <div className="px-6 pt-6 max-md:px-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
        <div className="mt-8 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[280px] shrink-0 space-y-2 rounded-lg bg-background p-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const project = projectQuery.data?.project;
  const members = projectQuery.data?.members ?? [];
  const myRole = projectQuery.data?.my_role;
  const isGuest = myRole === "guest";
  const canManageProject = myRole === "owner" || myRole === "admin";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border-strong px-6 pt-6 pb-3 max-md:px-4 max-md:pt-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-page-title text-text-primary">{project?.name}</h1>
          <span className="font-mono text-[12px] font-medium tabular-nums text-text-muted">
            {allTasks.length} tasks
          </span>
          {canManageProject && (
            <span className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Project actions"
                aria-expanded={menuOpen}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-surface-secondary hover:text-text-primary"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-popover">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmName("");
                        setDeleteOpen(true);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors duration-100 hover:bg-surface-secondary"
                    >
                      <Trash2 size={13} /> Delete project
                    </button>
                  </div>
                </>
              )}
            </span>
          )}
        </div>
        {project?.description && (
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-text-secondary">{project.description}</p>
        )}
        <div role="tablist" aria-label="Project views" className="mt-4 flex w-fit gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={view === t.key}
              onClick={() => {
                setView(t.key);
                const slug = project?.slug || projectKey;
                navigate(`/projects/${slug}/${t.key}`, { replace: true });
              }}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                view === t.key
                  ? "bg-surface-secondary text-text-primary"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-6 max-md:px-4">
        <div className="relative">
          <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this project"
            aria-label="Filter tasks by title"
            className="h-8 w-44 pl-7 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status" className="h-8 w-32 text-[13px]">
            <option value="all">All status</option>
            <option value="backlog">Backlog</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort tasks" className="h-8 w-32 text-[13px]">
            <option value="manual">Manual</option>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
          </Select>
          <Button variant="ghost" size="icon" aria-label="More filters">
            <Filter size={14} />
          </Button>
          <AvatarGroup people={members.map((m) => ({ initials: m.name.slice(0, 2).toUpperCase(), name: m.name, avatar_url: m.avatar_url }))} />
          {!isGuest && (
            <Button variant="primary" size="sm" onClick={() => openComposer("todo")}>
              <Plus size={14} /> Add task
            </Button>
          )}
        </div>
      </div>

      <div
        className={
          view === "board"
            ? "mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
            : "mt-4 min-h-0 flex-1 overflow-y-auto"
        }
      >
        {tasksQuery.isPending ? (
          <div className="flex gap-4 overflow-hidden px-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[280px] shrink-0 space-y-2 rounded-lg bg-background p-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {view === "board" && (
              <KanbanBoard
                tasks={visibleTasks}
                onMove={moveTask}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                onQuickAdd={openComposer}
              />
            )}
            {view === "list" && <ListView tasks={visibleTasks} onOpen={(t) => setOpenTaskId(t.id)} />}
            {view === "calendar" && <CalendarView tasks={visibleTasks} onOpen={(t) => setOpenTaskId(t.id)} />}
          </>
        )}
      </div>

      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Create task"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={createTask} disabled={!newTitle.trim() || createMutation.isPending}>
              Create task
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTask();
          }}
          className="space-y-4"
        >
          <Field label="Task title" htmlFor="task-title">
            <Input
              id="task-title"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Improve login experience"
            />
          </Field>
          <Field label="Status" htmlFor="task-status">
            <Select id="task-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)}>
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project?"
        description={`“${project?.name ?? "This project"}”, its tasks, comments, and activity will be permanently removed. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || confirmName !== (project?.name ?? "")}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete project"}
            </Button>
          </>
        }
      >
        <Field label={`Type “${project?.name ?? ""}” to confirm`} htmlFor="proj-delete-confirm">
          <Input
            id="proj-delete-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project?.name}
            autoComplete="off"
          />
        </Field>
      </Dialog>

      <TaskDrawer
        taskId={openTaskId}
        projectId={tasksKey}
        members={members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }))}
        onClose={() => setOpenTaskId(null)}
        onAfterDelete={() => setOpenTaskId(null)}
        onError={notifyError}
      />
    </div>
  );
}


/** Pure positional reorder used by the optimistic move. */
function reorder(
  prev: Task[] | undefined,
  id: number,
  status: TaskStatus,
  position: number,
): Task[] | undefined {
  if (!prev) return prev;
  const moving = prev.find((t) => t.id === id);
  if (!moving) return prev;

  const target = prev
    .filter((t) => t.status === status && t.id !== id)
    .sort((a, b) => a.position - b.position);

  target.splice(Math.min(position, target.length), 0, { ...moving, status });

  return [
    ...prev.filter((t) => t.status !== status && t.id !== id),
    ...target.map((t, i) =>
      t.id === id ? { ...t, status, position: i } : { ...t, position: i },
    ),
  ];
}
