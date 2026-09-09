import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { workspaceService } from "@/services/workspaces";
import { firstErrorMessage } from "@/services/api";
import { qk, useWorkspace } from "@/hooks/queries";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";

export function WorkspaceSettings() {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUi((s) => s.setActiveWorkspace);
  const workspaces = useAuth((s) => s.workspaces);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const myRole = workspaceQuery.data?.my_role;
  const isOwner = myRole === "owner";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hydratedFrom, setHydratedFrom] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const ws = workspaceQuery.data?.workspace;
  if (ws && hydratedFrom !== ws.id) {
    setHydratedFrom(ws.id);
    setName(ws.name);
    setDescription(ws.description ?? "");
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      workspaceService.update(activeWorkspaceId!, {
        name: name.trim(),
        description: description.trim() || null,
      }),
    onSuccess: () => {
      toast("success", "Workspace updated");
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      void qc.invalidateQueries({ queryKey: qk.workspace(activeWorkspaceId) });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspaceService.remove(activeWorkspaceId!),
    onSuccess: () => {
      toast("success", "Workspace deleted");
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      const remaining = workspaces.filter((w) => w.id !== activeWorkspaceId);
      setActiveWorkspace(remaining[0]?.id ?? null);
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  if (!activeWorkspaceId || workspaceQuery.isPending) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-8">
      <section aria-label="Workspace details">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) saveMutation.mutate();
          }}
        >
          <Field label="Workspace name" htmlFor="ws-set-name">
            <Input id="ws-set-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Description" htmlFor="ws-set-desc">
            <Textarea
              id="ws-set-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
            />
          </Field>
          <Button variant="primary" size="md" type="submit" disabled={saveMutation.isPending || !name.trim()}>
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </section>

      {isOwner && (
        <section aria-label="Danger zone" className="border-t border-border pt-6">
          <h2 className="text-[13px] font-semibold text-danger">Delete workspace</h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-text-secondary">
            This permanently removes all projects, tasks, and comments in this workspace. This action cannot be undone.
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
            Delete workspace
          </Button>
        </section>
      )}

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete workspace?"
        description={`“${ws?.name ?? "This workspace"}” and all of its projects, tasks, and comments will be permanently removed. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || confirmName !== (ws?.name ?? "")}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete workspace"}
            </Button>
          </>
        }
      >
        <Field label={`Type “${ws?.name ?? ""}” to confirm`} htmlFor="ws-delete-confirm">
          <Input
            id="ws-delete-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={ws?.name}
            autoComplete="off"
          />
        </Field>
      </Dialog>
    </div>
  );
}
