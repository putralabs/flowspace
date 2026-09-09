import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MailOpen, X } from "lucide-react";
import { invitationService } from "@/services/notifications";
import { firstErrorMessage } from "@/services/api";
import { qk } from "@/hooks/queries";
import { initialsOf } from "@/lib/constants";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

/** Accept or decline a workspace invitation by token. */
export function InvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuth((s) => s.user);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const previewQuery = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => invitationService.preview(token),
    enabled: token.length > 0,
    retry: false,
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: qk.myInvitations });
    void qc.invalidateQueries({ queryKey: qk.workspaces });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const acceptMutation = useMutation({
    mutationFn: () => invitationService.accept(token),
    onSuccess: (res) => {
      toast("success", res.message);
      setDone("accepted");
      refresh();
      useUi.getState().setActiveWorkspace(res.workspace.id);
      navigate(`/workspaces/${res.workspace.id}`, { replace: true });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const declineMutation = useMutation({
    mutationFn: () => invitationService.decline(token),
    onSuccess: (res) => {
      toast("success", res.message);
      setDone("declined");
      refresh();
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const busy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center max-md:py-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <MailOpen size={22} />
      </span>

      {previewQuery.isPending ? (
        <div className="mt-6 w-full space-y-3">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : previewQuery.isError || !previewQuery.data ? (
        <>
          <h1 className="mt-6 text-page-title text-text-primary">Undangan tidak valid</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            Undangan ini tidak ditemukan, sudah digunakan, atau sudah dibatalkan.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 text-[13px] font-medium text-accent hover:underline"
          >
            Kembali ke dashboard
          </Link>
        </>
      ) : (
        (() => {
          const inv = previewQuery.data;
          const forMe =
            user?.email.toLowerCase() === inv.email.toLowerCase();
          return (
            <>
              <h1 className="mt-6 text-page-title text-text-primary">Undangan workspace</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                Kamu diundang untuk bergabung ke workspace berikut:
              </p>

              <div className="mt-6 flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[13px] font-semibold text-text-secondary ring-1 ring-border">
                  {initialsOf(inv.workspace.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {inv.workspace.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    Untuk {inv.email}
                  </span>
                </span>
                <Badge className="shrink-0 capitalize">{inv.role}</Badge>
              </div>

              {!forMe && (
                <p role="alert" className="mt-4 w-full rounded-md bg-warning/10 px-3 py-2 text-[13px] text-warning">
                  Undangan ini untuk {inv.email}, tapi kamu login sebagai {user?.email}. Minta
                  pengundang mengirim ulang ke email ini, atau login dengan akun yang benar.
                </p>
              )}

              {done === null && (
                <div className="mt-6 flex w-full gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    disabled={busy || !forMe}
                    onClick={() => declineMutation.mutate()}
                  >
                    <X size={14} /> {declineMutation.isPending ? "Menolak..." : "Tolak"}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    disabled={busy || !forMe}
                    onClick={() => acceptMutation.mutate()}
                  >
                    <Check size={14} /> {acceptMutation.isPending ? "Menerima..." : "Terima"}
                  </Button>
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
