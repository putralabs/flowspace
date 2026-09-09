import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { invitationService } from "@/services/notifications";
import { firstErrorMessage } from "@/services/api";
import { qk, useWorkspaceInvitations } from "@/hooks/queries";
import { initialsOf } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

/** Pending workspace invitations: visible while waiting for confirmation. */
export function PendingInvitations({
  workspaceId,
  canManage,
}: {
  workspaceId: number;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const pendingQuery = useWorkspaceInvitations(canManage ? workspaceId : null);
  const pending = pendingQuery.data ?? [];

  const revokeMutation = useMutation({
    mutationFn: (id: number) => invitationService.revoke(workspaceId, id),
    onSuccess: (res) => {
      toast("success", res.message);
      void qc.invalidateQueries({ queryKey: qk.workspaceInvitations(workspaceId) });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  if (!canManage || pending.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Pending invitations">
      <div className="mb-4 border-b border-border pb-1.5">
        <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-text-primary">
          Pending invitations
          <span className="font-mono text-[11px] font-medium tabular-nums text-text-muted">
            {pending.length}
          </span>
        </h2>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-dashed border-border bg-surface">
        {pending.map((inv) => (
          <li key={inv.id} className="group flex items-center gap-2.5 px-4 py-3">
            <Avatar
              initials={initialsOf(inv.invitee?.name ?? inv.email)}
              seed={inv.invitee?.name ?? inv.email}
              src={inv.invitee?.avatar_url}
              alt={inv.invitee?.name ?? inv.email}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text-primary">{inv.email}</p>
              <p className="truncate text-xs text-text-muted">
                Invited {timeAgo(inv.created_at)}
                {inv.inviter?.name ? ` by ${inv.inviter.name}` : ""} · waiting for confirmation
              </p>
            </div>
            <Badge className="shrink-0 capitalize">{inv.role}</Badge>
            <button
              type="button"
              onClick={() => revokeMutation.mutate(inv.id)}
              aria-label={`Cancel invitation for ${inv.email}`}
              title={`Cancel invitation for ${inv.email}`}
              disabled={revokeMutation.isPending}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-surface-secondary hover:text-danger focus-visible:opacity-100 disabled:opacity-50 [@media(hover:none)]:opacity-100"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-text-muted">
        They will appear in the member list after accepting the invitation.
      </p>
    </section>
  );
}
