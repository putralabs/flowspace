import { useRef, useState } from "react";
import { CalendarDays, Download, Flag, Paperclip, Trash2, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentService, taskService } from "@/services/tasks";
import { firstErrorMessage } from "@/services/api";
import { qk, useActivities, useLabels } from "@/hooks/queries";
import { priorityMeta, statusMeta, statusOrder } from "@/lib/constants";
import type { Attachment, Priority, Task, TaskStatus } from "@/types";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { LabelChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusIcon } from "@/components/task/meta";
import { useProject } from "@/hooks/queries";
import { CommentList } from "./comments";
import { shortDate } from "@/lib/format";

const priorityOptions: Priority[] = ["none", "low", "medium", "high", "urgent"];

interface TaskDrawerProps {
  taskId: number | null;
  projectId: number | string;
  members: { id: number; name: string; avatar_url?: string | null }[];
  onClose: () => void;
  onAfterDelete: () => void;
  onError: (message: string) => void;
}

export function TaskDrawer({
  taskId,
  projectId,
  members,
  onClose,
  onAfterDelete,
  onError,
}: TaskDrawerProps) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Detail query: labels, assignee, creator, history context.
  const detail = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskService.get(taskId!),
    enabled: taskId != null,
  });

  const task: Task | null =
    detail.data ??
    qc.getQueryData<Task[]>(qk.tasks(projectId))?.find((t) => t.id === taskId) ??
    null;

  const invalidateTasks = () => {
    void qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
    if (taskId) void qc.invalidateQueries({ queryKey: ["task", taskId] });
    void qc.invalidateQueries({ queryKey: qk.activities(projectId) });
  };

  /** Optimistic field update with rollback (PRD §25). */
  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => taskService.update(taskId!, patch),
    onMutate: async (patch: Partial<Task> & { label_ids?: number[] }) => {
      await qc.cancelQueries({ queryKey: qk.tasks(projectId) });
      const prevList = qc.getQueryData<Task[]>(qk.tasks(projectId));
      const prevDetail = qc.getQueryData<Task>(["task", taskId]);
      const apply = (t: Task): Task => ({
        ...t,
        ...patch,
        updated_at: new Date().toISOString(),
      });
      qc.setQueryData<Task[]>(qk.tasks(projectId), (old) =>
        old?.map((t) => (t.id === taskId ? apply(t) : t)),
      );
      qc.setQueryData<Task>(["task", taskId], (old) => (old ? apply(old) : old));
      return { prevList, prevDetail };
    },
    onSuccess: () => invalidateTasks(),
    onError: (err, _patch, ctx) => {
      if (ctx?.prevList) qc.setQueryData(qk.tasks(projectId), ctx.prevList);
      if (ctx?.prevDetail) qc.setQueryData(["task", taskId], ctx.prevDetail);
      onError(firstErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskService.remove(taskId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      onAfterDelete();
    },
    onError: (err) => onError(firstErrorMessage(err)),
  });

  function patch(patchObj: Partial<Task> & { label_ids?: number[] }) {
    if (!taskId) return;
    updateMutation.mutate(patchObj as Record<string, unknown>);
  }

  return (
    <Drawer open={Boolean(taskId)} onClose={onClose} title="Task">
      {!task ? (
        <div className="flex-1 space-y-4 px-5 py-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-background p-3.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-start gap-2.5">
              <StatusIcon status={task.status} className="mt-1" />
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => {
                      const v = titleDraft.trim();
                      if (v && v !== task.title) patch({ title: v });
                      setEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    aria-label="Task title"
                    className="w-full rounded-md border border-accent bg-surface px-1.5 py-0.5 text-base font-semibold text-text-primary outline-none ring-2 ring-accent/20"
                  />
                ) : (
                  <h2
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setTitleDraft(task.title);
                      setEditingTitle(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setTitleDraft(task.title);
                        setEditingTitle(true);
                      }
                    }}
                    aria-label="Edit task title"
                    title="Click to rename"
                    className="-mx-1.5 cursor-text rounded-md border border-transparent px-1.5 py-0.5 text-base leading-snug font-semibold text-text-primary transition-colors hover:border-border"
                  >
                    {task.title}
                  </h2>
                )}
                <p className="mt-0.5 text-xs text-text-secondary">
                  Created by {task.creator?.name ?? `#${task.creator_id}`} &middot; updated{" "}
                  {shortDate(task.updated_at)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete task">
                <Trash2 size={15} className="text-text-muted" />
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-background p-3.5 text-[13px]">
              <span className="flex items-center gap-2 text-text-muted">
                <Flag size={13} /> Status
              </span>
              <Select
                value={task.status}
                onChange={(e) => patch({ status: e.target.value as TaskStatus })}
                aria-label="Task status"
                className="h-8 text-[13px]"
              >
                {statusOrder.map((s) => (
                  <option key={s} value={s}>
                    {statusMeta[s].label}
                  </option>
                ))}
              </Select>

              <span className="flex items-center gap-2 text-text-muted">
                <Flag size={13} /> Priority
              </span>
              <Select
                value={task.priority}
                onChange={(e) => patch({ priority: e.target.value as Priority })}
                aria-label="Task priority"
                className="h-8 text-[13px]"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {priorityMeta[p].label}
                  </option>
                ))}
              </Select>

              <span className="flex items-center gap-2 text-text-muted">
                <UserRound size={13} /> Assignee
              </span>
              <Select
                value={task.assignee_id ?? ""}
                onChange={(e) =>
                  patch({ assignee_id: e.target.value ? Number(e.target.value) : null })
                }
                aria-label="Task assignee"
                className="h-8 text-[13px]"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>

              <span className="flex items-center gap-2 text-text-muted">
                <CalendarDays size={13} /> Due date
              </span>
              <input
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => patch({ due_date: e.target.value || null })}
                aria-label="Task due date"
                className="h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <section className="mt-6" aria-label="Description">
              <h3 className="text-sm font-semibold text-text-primary">Description</h3>
              <textarea
                defaultValue={task.description ?? ""}
                placeholder="Add more context, acceptance criteria, or links."
                onBlur={(e) =>
                  e.target.value !== (task.description ?? "") && patch({ description: e.target.value })
                }
                rows={4}
                aria-label="Task description"
                className="mt-2 w-full resize-none rounded-md border border-transparent bg-transparent p-0 text-[13px] leading-relaxed text-text-secondary transition-colors placeholder:text-text-muted hover:border-border hover:p-2 focus:border-accent focus:bg-surface focus:p-2 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </section>

            <LabelSection projectId={projectId} detailLabels={detail.data?.labels} onToggle={(ids) => patch({ label_ids: ids })} />

            <AttachmentSection taskId={task.id} onError={onError} />

            <section className="mt-6 border-t border-border pt-5" aria-label="Comments">
              <h3 className="mb-4 text-sm font-semibold text-text-primary">Comments</h3>
              <CommentList projectId={projectId} taskId={task.id} members={members} onError={onError} />
            </section>

            <TaskHistorySection projectId={projectId} taskTitle={task.title} />
          </div>
        </div>
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete task"
        description="This permanently removes the task and its comments."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setConfirmDelete(false);
                deleteMutation.mutate();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="rounded-md bg-danger/10 px-3 py-2.5 text-[13px] text-text-primary">
          &ldquo;{task?.title}&rdquo; will be removed for everyone in this project.
        </p>
      </Dialog>
    </Drawer>
  );
}

function LabelSection({
  projectId,
  detailLabels,
  onToggle,
}: {
  projectId: number | string;
  detailLabels?: { id: number; name: string; color: string }[];
  onToggle: (ids: number[]) => void;
}) {
  const projectQuery = useProject(projectId);
  const workspaceId = projectQuery.data?.project.workspace_id ?? null;
  const labelsQuery = useLabels(workspaceId);
  const allLabels = labelsQuery.data ?? [];
  const activeIds = new Set((detailLabels ?? []).map((l) => l.id));

  function toggle(id: number) {
    const next = activeIds.has(id)
      ? [...activeIds].filter((x) => x !== id)
      : [...activeIds, id];
    onToggle(next);
  }

  return (
    <section className="mt-5" aria-label="Labels">
      <h3 className="text-sm font-semibold text-text-primary">Labels</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(detailLabels ?? []).map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
        {(detailLabels ?? []).length === 0 && (
          <span className="text-[13px] text-text-muted">No labels yet. Pick below.</span>
        )}
      </div>
      {allLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Toggle labels">
          {allLabels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle(l.id)}
              aria-pressed={activeIds.has(l.id)}
              className="cursor-pointer rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className={activeIds.has(l.id) ? "block" : "block opacity-50"}>
                <LabelChip label={l} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentSection({
  taskId,
  onError,
}: {
  taskId: number;
  onError: (message: string) => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const listQuery = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: () => attachmentService.listByTask(taskId),
    enabled: taskId > 0,
  });
  const attachments: Attachment[] = listQuery.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(taskId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attachments", taskId] });
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (err) => {
      onError(firstErrorMessage(err));
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => attachmentService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
    onError: (err) => onError(firstErrorMessage(err)),
  });

  async function handleDownload(a: Attachment) {
    try {
      setBusy(true);
      const { blob, filename } = await attachmentService.download(a.id);
      attachmentService.saveBlob(blob, filename);
    } catch {
      onError("Gagal mengunduh file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5" aria-label="Attachments">
      <h3 className="text-sm font-semibold text-text-primary">Attachments</h3>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="mt-2 flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border bg-background px-3 py-4 text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary disabled:pointer-events-none disabled:opacity-50"
      >
        <Paperclip size={15} />
        <span className="text-[12px]">
          {uploadMutation.isPending ? "Uploading..." : "Attach a file (PNG, PDF, DOCX, ZIP, max 10 MB)"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.zip"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])}
      />
      <ul className="mt-2 space-y-1">
        {listQuery.isPending && <li className="rounded-md bg-surface-secondary/60 px-2.5 py-1.5"><Skeleton className="h-4 w-full" /></li>}
        {attachments.map((a) => (
          <li
            key={a.id}
            className="group flex items-center gap-2 rounded-md bg-surface-secondary/60 px-2.5 py-1.5 text-xs"
          >
            <button
              type="button"
              onClick={() => void handleDownload(a)}
              disabled={busy}
              title="Download"
              className="min-w-0 flex-1 cursor-pointer truncate text-left font-medium text-text-primary hover:text-accent hover:underline disabled:opacity-50"
            >
              {a.filename}
              <span className="ml-1.5 font-normal text-text-muted">{formatBytes(a.size)}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDownload(a)}
              aria-label={`Download ${a.filename}`}
              disabled={busy}
              className="cursor-pointer text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary focus-visible:opacity-100"
            >
              <Download size={12} />
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(a.id)}
              aria-label={`Delete ${a.filename}`}
              className="cursor-pointer text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
        {!listQuery.isPending && attachments.length === 0 && (
          <li className="flex items-center justify-between rounded-md bg-surface-secondary/60 px-2.5 py-1.5 text-xs text-text-muted">
            No attachments yet
          </li>
        )}
      </ul>
    </section>
  );
}

function TaskHistorySection({
  projectId,
  taskTitle,
}: {
  projectId: number | string;
  taskTitle: string;
}) {
  // Fetch the project's activity feed directly instead of relying on whatever
  // happens to sit in the cache (previously this was almost always empty, and
  // never refreshed, so history looked missing - especially on other accounts).
  const activitiesQuery = useActivities(projectId);

  const related = (activitiesQuery.data ?? []).filter((a) => a.target === taskTitle).slice(0, 6);

  return (
    <section className="mt-6 border-t border-border pt-5 pb-2" aria-label="Activity history">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">History</h3>
      <ol aria-label="Task activity">
        {related.map((a) => (
          <li key={a.id} className="flex items-baseline gap-2 pb-2 text-[12px] text-text-secondary">
            <strong className="font-medium text-text-primary">{a.actor?.name ?? "Someone"}</strong>
            <span>{a.action}</span>
            <span className="truncate">{a.target}</span>
            <time className="ml-auto shrink-0 text-xs text-text-secondary">{shortDate(a.created_at)}</time>
          </li>
        ))}
        {related.length === 0 && <li className="text-[13px] text-text-muted">No activity yet.</li>}
      </ol>
    </section>
  );
}
