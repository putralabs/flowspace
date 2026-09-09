import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Plus, Trash2, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspaces";
import { invitationService } from "@/services/notifications";
import { firstErrorMessage } from "@/services/api";
import { qk, useMyInvitations, useWorkspaces } from "@/hooks/queries";
import { useUi } from "@/stores/ui";
import { initialsOf } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { Workspace } from "@/types";

export function WorkspacesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const workspacesQuery = useWorkspaces();
  const setActiveWorkspace = useUi.getState().setActiveWorkspace;
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workspaceService.remove(id),
    onSuccess: (_, id) => {
      toast("success", "Workspace deleted");
      setDeleteTarget(null);
      setConfirmName("");
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      if (activeWorkspaceId === id) {
        const remaining = (workspacesQuery.data ?? []).filter((w) => w.id !== id);
        setActiveWorkspace(remaining[0]?.id ?? null);
        navigate("/dashboard", { replace: true });
      }
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      workspaceService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      }),
    onSuccess: (workspace) => {
      toast("success", `Workspace "${workspace.name}" created`);
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      setCreateOpen(false);
      setForm({ name: "", description: "" });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const workspaces = workspacesQuery.data ?? [];
  const myInvitesQuery = useMyInvitations();
  const myInvites = myInvitesQuery.data ?? [];

  const acceptInviteMutation = useMutation({
    mutationFn: (token: string) => invitationService.accept(token),
    onSuccess: (res) => {
      toast("success", res.message);
      void qc.invalidateQueries({ queryKey: qk.myInvitations });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      setActiveWorkspace(res.workspace.id);
      navigate(`/workspaces/${res.workspace.id}`, { replace: true });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const declineInviteMutation = useMutation({
    mutationFn: (token: string) => invitationService.decline(token),
    onSuccess: (res) => {
      toast("success", res.message);
      void qc.invalidateQueries({ queryKey: qk.myInvitations });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header className="flex items-center justify-between border-b border-border-strong pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">
            Workspaces
            <span className="font-mono ml-2.5 align-middle text-[12px] font-medium tabular-nums text-text-muted">
              {workspaces.length}
            </span>
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">Spaces where your teams collaborate.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New workspace
        </Button>
      </header>

      {workspacesQuery.isPending ? (
        <div className="mt-2 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {workspaces.map((w) => {
            return (
              <li key={w.id}>
                <Link
                  to={`/workspaces/${w.id}`}
                  onClick={() => setActiveWorkspace(w.id)}
                  className="group flex items-center gap-4 py-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[13px] font-semibold tracking-tight text-text-secondary ring-1 ring-border">
                    {initialsOf(w.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary group-hover:text-accent">
                      {w.name}
                    </span>
                    <span className="block truncate text-xs text-text-muted">{w.description}</span>
                  </span>
                  <span className="font-mono hidden items-center gap-1.5 text-xs tabular-nums text-text-muted sm:flex">
                    <Users size={13} />
                    {w.members_count ?? 0}
                    <span aria-hidden="true" className="mx-1 text-border">|</span>
                    {w.projects_count ?? 0} projects
                  </span>
                  <Badge className="shrink-0 capitalize">{w.my_role}</Badge>
                  {w.my_role === "owner" && (
                    <button
                      type="button"
                      aria-label={`Delete ${w.name}`}
                      title={`Delete ${w.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmName("");
                        setDeleteTarget(w);
                      }}
                      className="shrink-0 cursor-pointer rounded-md p-1.5 text-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-surface-secondary hover:text-danger focus-visible:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  />
                </Link>
              </li>
            );
          })}
          {workspaces.length === 0 && !workspacesQuery.isPending && (
            <li className="py-16 text-center">
              <p className="text-sm font-medium text-text-primary">No workspaces yet</p>
              <p className="mt-1 text-[13px] text-text-muted">
                Create one to start collaborating with your team.
              </p>
            </li>
          )}
        </ul>
      )}

      {myInvites.length > 0 && (
        <section className="mt-8" aria-label="Workspace invitations">
          <div className="mb-4 border-b border-border pb-1.5">
            <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-text-primary">
              Workspace invitations
              <span className="font-mono text-[11px] font-medium tabular-nums text-text-muted">
                {myInvites.length}
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {myInvites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[13px] font-semibold tracking-tight text-text-secondary ring-1 ring-border">
                  {initialsOf(inv.workspace?.name ?? "?")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {inv.workspace?.name ?? "Workspace"}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    Invited{inv.inviter?.name ? ` by ${inv.inviter.name}` : ""} · as {inv.role} ·{" "}
                    {timeAgo(inv.created_at)}
                  </span>
                </span>
                <Badge className="shrink-0 capitalize">{inv.role}</Badge>
                <span className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={declineInviteMutation.isPending || acceptInviteMutation.isPending}
                    onClick={() => declineInviteMutation.mutate(inv.token)}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={declineInviteMutation.isPending || acceptInviteMutation.isPending}
                    onClick={() => acceptInviteMutation.mutate(inv.token)}
                  >
                    Accept
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete workspace?"
        description={`“${deleteTarget?.name ?? "This workspace"}” and all of its projects, tasks, and comments will be permanently removed. This cannot be undone.`}
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
              {deleteMutation.isPending ? "Deleting..." : "Delete workspace"}
            </Button>
          </>
        }
      >
        <Field label={`Type “${deleteTarget?.name ?? ""}” to confirm`} htmlFor="ws-row-delete-confirm">
          <Input
            id="ws-row-delete-confirm"
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
        title="Create workspace"
        description="A workspace holds your projects and team."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Workspace name" htmlFor="ws-name">
            <Input
              id="ws-name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Product Team"
            />
          </Field>
          <Field label="Description" htmlFor="ws-desc" hint="Optional. One line about what this team does.">
            <Textarea
              id="ws-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this workspace for?"
            />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
