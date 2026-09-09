import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useUi } from "@/stores/ui";
import { useWorkspaces } from "@/hooks/queries";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNavigation } from "./mobile-nav";
import { CommandPalette } from "./command-palette";
import { ShortcutsDialog } from "./shortcuts-dialog";

/** Project detail (/projects/:slug/...) pins its own scroll areas so the board's horizontal scrollbar stays fixed at the bottom of the viewport. */
export function isProjectDetailPath(pathname: string): boolean {
  const parts = pathname.split("/");
  return parts[1] === "projects" && Boolean(parts[2]);
}

function AnimatedOutlet() {
  const location = useLocation();
  const projectDetail = isProjectDetailPath(location.pathname);
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={projectDetail ? "h-full min-h-full" : "min-h-full"}
    >
      <Outlet />
    </motion.div>
  );
}

/** Ensures a workspace is active so queries + presence channels bind. */
function WorkspaceBootstrap() {
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUi((s) => s.setActiveWorkspace);
  const workspacesQuery = useWorkspaces();

  useEffect(() => {
    if (!workspacesQuery.isSuccess) return;
    const list = workspacesQuery.data ?? [];
    // Pick the first workspace when none is selected, or when the selected
    // one isn't in this account's list (e.g. after switching accounts).
    if ((!activeWorkspaceId || !list.some((w) => w.id === activeWorkspaceId)) && list[0]) {
      setActiveWorkspace(list[0].id);
    } else if (list.length === 0 && activeWorkspaceId) {
      setActiveWorkspace(null);
    }
  }, [activeWorkspaceId, workspacesQuery.isSuccess, workspacesQuery.data, setActiveWorkspace]);

  return null;
}

export function AppShell() {
  const location = useLocation();
  const projectDetail = isProjectDetailPath(location.pathname);
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="h-[3px] shrink-0 bg-text-primary" aria-hidden="true" />
      <div className="flex min-h-0 flex-1">
        <WorkspaceBootstrap />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main
            className={
              projectDetail
                ? "min-h-0 flex-1 overflow-hidden pb-16 md:pb-0"
                : "min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0"
            }
            id="main-content"
          >
            <AnimatedOutlet />
          </main>
        </div>
        <CommandPalette />
        <ShortcutsDialog />
        <MobileNavigation />
      </div>
    </div>
  );
}
