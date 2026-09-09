import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspaces";
import { firstErrorMessage } from "@/services/api";
import { qk, useProjects, useWorkspace } from "@/hooks/queries";
import { initialsOf } from "@/lib/constants";
import { useRealtime } from "@/stores/realtime";
import { useUi } from "@/stores/ui";
import type { WorkspaceRole } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PendingInvitations } from "@/features/workspace/pending-invitations";

const roleOptions = ["admin", "member", "guest"] as const;

const roleDot: Record<(typeof roleOptions)[number] | "owner", string> = {
  owner: "bg-accent",
  admin: "bg-info",
  member: "bg-success",
  guest: "bg-text-muted",
};

export function WorkspaceDetailPage() {
  const { workspaceId: workspaceIdParam } = useParams();
  const workspaceId = Number(workspaceIdParam);
  const qc = useQueryClient();
  const { toast } = useToast();
  const onlineUserIds = useRealtime((s) => s.onlineUserIds);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof roleOptions)[number]>("member");
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);

  const workspaceQuery = useWorkspace(Number.isFinite(workspaceId) ? workspaceId : null);
  const projectsQuery = useProjects(Number.isFinite(workspaceId) ? workspaceId : null);
  const setActiveWorkspace = useUi((s) => s.setActiveWorkspace);

  // Opening a workspace from a link/notification must also select it,
  // otherwise the sidebar and workspace-scoped pages keep showing the old one.
  useEffect(() => {
    if (workspaceQuery.isSuccess && workspaceQuery.data && Number.isFinite(workspaceId)) {
      if (useUi.getState().activeWorkspaceId !== workspaceId) {
        setActiveWorkspace(workspaceId);
      }
    }
  }, [workspaceQuery.isSuccess, workspaceQuery.data, workspaceId, setActiveWorkspace]);

  const inviteMutation = useMutation({
    mutationFn: () =>
      workspaceService.inviteMember(workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: (res) => {
      toast("success", res.message);
      void qc.invalidateQueries({ queryKey: qk.workspace(workspaceId) });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) });
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: number; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(workspaceId, input.memberId, input.role),
    onSuccess: () => {
      toast("success", "Role updated");
      void qc.invalidateQueries({ queryKey: qk.workspace(workspaceId) });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: number) => workspaceService.removeMember(workspaceId, memberId),
    onSuccess: () => {
      toast("success", "Member removed");
      setRemoveTarget(null);
      void qc.invalidateQueries({ queryKey: qk.workspace(workspaceId) });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  if (workspaceQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full" />
      </div>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-semibold text-text-primary">Workspace not found</p>
        <p className="max-w-xs text-[13px] text-text-secondary">
          You may not be a member of this workspace.
        </p>
      </div>
    );
  }

  const { workspace, my_role, members } = workspaceQuery.data;
  const projects = projectsQuery.data ?? [];
  const canManage = my_role === "owner" || my_role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 max-md:px-4 max-md:py-6">
      <header className="pb-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-page-title text-text-primary">{workspace.name}</h1>
          <span className="font-mono text-[12px] font-medium tabular-nums text-text-muted">
            {projects.length} projects · {members.length} members
          </span>
        </div>
        <p className="mt-1 text-[13px] text-text-secondary">{workspace.description}</p>
      </header>

      <section className="mt-6" aria-label="Projects in workspace">
        <div className="mb-4 border-b border-border pb-1.5">
          <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-text-primary">
            Projects
            <span className="font-mono text-[11px] font-medium tabular-nums text-text-muted">
              {projects.length}
            </span>
          </h2>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-[13px] font-medium text-text-primary">{p.name}</span>
              <span className="font-mono text-[11px] tabular-nums text-text-muted">{p.tasks_count ?? 0} tasks</span>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-text-muted">No projects yet.</li>
          )}
        </ul>
      </section>

      <section className="mt-8" aria-label="Members">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-1.5">
          <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-text-primary">
            Members
            <span className="font-mono text-[11px] font-medium tabular-nums text-text-muted">
              {members.length}
            </span>
          </h2>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          )}
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {members.map((m) => (
            <li
              key={m.id}
              className="group flex items-center gap-2.5 px-4 py-3 transition-colors duration-100 hover:bg-surface-secondary/40"
            >
              <Avatar
                initials={initialsOf(m.name)}
                seed={m.name}
                src={m.avatar_url}
                alt={m.name}
                presence={onlineUserIds[m.id] ? "online" : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-text-primary">{m.name}</p>
                <p className="truncate text-xs text-text-muted">{m.email}</p>
              </div>
              {canManage && m.role !== "owner" ? (
                <>
                  <span className="relative inline-flex shrink-0 items-center">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-2.5 h-2 w-2 rounded-full ${roleDot[m.role]}`}
                    />
                    <select
                      value={m.role}
                      onChange={(e) =>
                        roleMutation.mutate({ memberId: m.id, role: e.target.value as WorkspaceRole })
                      }
                      aria-label={`Change role for ${m.name}`}
                      title={`Change role for ${m.name}`}
                      className="h-8 w-28 cursor-pointer appearance-none rounded-full border border-border bg-surface py-0 pr-7 pl-7 text-xs font-medium text-text-primary capitalize transition-colors duration-150 hover:border-border-strong hover:bg-surface-secondary focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-muted"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget({ id: m.id, name: m.name })}
                    aria-label={`Remove ${m.name}`}
                    title={`Remove ${m.name}`}
                    className="shrink-0 cursor-pointer rounded-md p-1.5 text-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-surface-secondary hover:text-danger focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : canManage ? (
                <>
                  <span
                    className="relative inline-flex h-8 w-28 shrink-0 items-center rounded-full border border-border bg-surface py-0 pr-7 pl-7 text-xs font-medium text-text-primary capitalize"
                    title="Workspace owner"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1/2 left-2.5 h-2 w-2 -translate-y-1/2 rounded-full ${roleDot.owner}`}
                    />
                    Owner
                    <ShieldCheck
                      size={13}
                      className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-muted"
                    />
                  </span>
                  {/* Spacer selebar tombol hapus agar pill sejajar dengan dropdown role lain */}
                  <span aria-hidden="true" className="h-[26px] w-[26px] shrink-0" />
                </>
              ) : (
                <Badge className="gap-1 capitalize">
                  {m.role === "owner" && <ShieldCheck size={11} />}
                  {m.role}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </section>

      <PendingInvitations workspaceId={workspaceId} canManage={canManage} />

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget?.name ?? "member"}?`}
        description="They will lose access to this workspace and all its projects."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing..." : "Remove member"}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-text-secondary">
          <strong className="font-medium text-text-primary">{removeTarget?.name}</strong> will no
          longer see this workspace, its projects, or its tasks. This cannot be undone.
        </p>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        description="The person must already have a Flowspace account. They join after accepting the invitation."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
            >
              Send invite
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Email address" htmlFor="inv-email">
            <span className="relative block">
              <Mail size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
              <Input
                id="inv-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="pl-9"
              />
            </span>
          </Field>
          <Field label="Role" htmlFor="inv-role">
            <Select
              id="inv-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as (typeof roleOptions)[number])}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
