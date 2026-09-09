import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/services/workspaces";
import { firstErrorMessage } from "@/services/api";
import { qk, useProjects, useWorkspaces } from "@/hooks/queries";
import { useUi } from "@/stores/ui";
import { initialsOf, projectUrl } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { shortDate } from "@/lib/format";
import type { Project } from "@/types";

const statusTone: Record<string, string> = {
  planned: "text-info",
  active: "text-success",
  on_hold: "text-warning",
  completed: "text-success",
  archived: "text-text-muted",
};

const COLORS = ["#4f46e5", "#2f7d5a", "#a66a1f", "#b94a48", "#3f6fa8"];

export function ProjectsPage() {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const projectsQuery = useProjects(activeWorkspaceId);
  const projects = projectsQuery.data ?? [];
  const workspacesQuery = useWorkspaces();
  const myRole = workspacesQuery.data?.find((w) => w.id === activeWorkspaceId)?.my_role;
  const canManage = myRole === "owner" || myRole === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", dueDate: "", color: COLORS[0] });
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.remove(id),
    onSuccess: () => {
      toast("success", "Project deleted");
      setDeleteTarget(null);
      setConfirmName("");
      void qc.invalidateQueries({ queryKey: qk.projects(activeWorkspaceId) });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectService.create(activeWorkspaceId!, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        status: "planned",
        due_date: form.dueDate || null,
      }),
    onSuccess: (project) => {
      toast("success", `Project "${project.name}" created`);
      void qc.invalidateQueries({ queryKey: qk.projects(activeWorkspaceId) });
      setCreateOpen(false);
      setForm({ name: "", description: "", dueDate: "", color: COLORS[0] });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  function submit() {
    if (!form.name.trim() || !activeWorkspaceId) return;
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header className="flex items-center justify-between border-b border-border-strong pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">
            Projects
            <span className="font-mono ml-2.5 align-middle text-[12px] font-medium tabular-nums text-text-muted">
              {projects.length}
            </span>
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">Everything this workspace is building.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Create project
        </Button>
      </header>

      {projectsQuery.isPending ? (
        <div className="mt-2 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <ul className="divide-y divide-border">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={projectUrl(p)} className="group flex flex-wrap items-center gap-4 py-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                  style={{ backgroundColor: `color-mix(in srgb, ${p.color} 14%, transparent)`, color: p.color }}
                >
                  {initialsOf(p.name)}
                </span>
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate text-sm font-medium text-text-primary group-hover:text-accent">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">{p.description}</span>
                </span>
                <Badge className={`capitalize ${statusTone[p.status]}`}>{p.status.replace("_", " ")}</Badge>
                <span className="hidden w-32 sm:block">
                  <span className="font-mono block text-right text-[11px] tabular-nums text-text-muted">
                    {p.tasks_count ?? 0} tasks
                  </span>
                  <span className="font-mono mt-1 block text-right text-[11px] tabular-nums text-text-muted">
                    Due {shortDate(p.due_date)}
                  </span>
                </span>
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    title={`Delete ${p.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmName("");
                      setDeleteTarget(p);
                    }}
                    className="shrink-0 cursor-pointer rounded-md p-1.5 text-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-surface-secondary hover:text-danger focus-visible:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-20 text-center">
          <p className="text-base font-semibold text-text-primary">No projects yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-text-secondary">
            Create your first project to start organizing your team&rsquo;s work.
          </p>
          <Button variant="primary" size="md" className="mt-5" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Create project
          </Button>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete project?"
        description={`“${deleteTarget?.name ?? "This project"}”, its tasks, comments, and activity will be permanently removed. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending || confirmName !== (deleteTarget?.name ?? "")}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete project"}
            </Button>
          </>
        }
      >
        <Field label={`Type “${deleteTarget?.name ?? ""}” to confirm`} htmlFor="proj-row-delete-confirm">
          <Input
            id="proj-row-delete-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={deleteTarget?.name}
            autoComplete="off"
          />
        </Field>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={submit} disabled={!form.name.trim() || createMutation.isPending}>
              Create
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <Field label="Project name" htmlFor="proj-name">
            <Input
              id="proj-name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Website Redesign"
            />
          </Field>
          <Field label="Description" htmlFor="proj-desc" hint="One line about the outcome.">
            <Textarea
              id="proj-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does done look like?"
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date" htmlFor="proj-due">
              <Input
                id="proj-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
            <Field label="Color" htmlFor="proj-color">
              <div id="proj-color" role="radiogroup" aria-label="Project color" className="flex h-9 items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={form.color === c}
                    aria-label={`Color ${c}`}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-5 w-5 cursor-pointer rounded-full transition-shadow ${
                      form.color === c ? "ring-2 ring-text-primary ring-offset-2 ring-offset-surface" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
