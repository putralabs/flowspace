import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";
import { useRealtimeBindings } from "@/websocket/bindings";
import { LandingPage } from "@/pages/landing";
import { AuthLayout } from "@/pages/auth/auth-layout";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password";
import { GoogleCallbackPage } from "@/pages/auth/google-callback";
import { DashboardPage } from "@/pages/dashboard";
import { ProjectsPage } from "@/pages/projects";
import { ProjectPage } from "@/pages/project";
import { InvitationPage } from "@/pages/invitation";
import { MyTasksPage } from "@/pages/my-tasks";
import { InboxPage } from "@/pages/inbox";
import { WorkspacesPage } from "@/pages/workspaces";
import { WorkspaceDetailPage } from "@/pages/workspace-detail";
import { SettingsLayout } from "@/pages/settings-layout";
import { ProfileSettings } from "@/pages/settings/profile";
import { WorkspaceSettings } from "@/pages/settings/workspace";
import { MembersSettings } from "@/pages/settings/members";
import { NotificationsSettings } from "@/pages/settings/notifications";

function ShortcutLayer() {
  useShortcuts();
  return null;
}

/** Boots session once and wires global listeners. */
function AppBootstrap() {
  const init = useAuth((s) => s.init);
  const status = useAuth((s) => s.status);
  const clear = useAuth((s) => s.clear);
  const userId = useAuth((s) => s.user?.id ?? null);
  const activeWorkspaceId = useUi((s) => s.activeWorkspaceId);

  useRealtimeBindings(userId, activeWorkspaceId);

  useEffect(() => {
    if (status === "idle") void init();
  }, [status, init]);

  useEffect(() => {
    const onUnauthorized = () => clear();
    window.addEventListener("flowspace:unauthorized", onUnauthorized);
    return () => window.removeEventListener("flowspace:unauthorized", onUnauthorized);
  }, [clear]);

  return null;
}

/** Offline/online toasts (PRD §26). */
function ConnectionWatcher() {
  const { toast } = useToast();

  useEffect(() => {
    function goOffline() {
      toast("error", "Connection lost. Reconnecting...");
    }
    function goOnline() {
      toast("success", "Back online");
      void queryClient.resumePausedMutations();
      void queryClient.invalidateQueries();
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [toast]);

  return null;
}

function RequireAuth() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (status !== "ready") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background" role="status" aria-label="Loading">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  if (status === "ready" && user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppBootstrap />
          <ShortcutLayer />
          <ConnectionWatcher />
          <Routes>
            <Route
              element={
                <RedirectIfAuthed>
                  <AuthLayout />
                </RedirectIfAuthed>
              }
            >
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/callback/google" element={<GoogleCallbackPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:projectSlug/:view?" element={<ProjectPage />} />
                <Route path="/my-tasks" element={<MyTasksPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/invitations/:token" element={<InvitationPage />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="profile" replace />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="workspace" element={<WorkspaceSettings />} />
                  <Route path="members" element={<MembersSettings />} />
                  <Route path="notifications" element={<NotificationsSettings />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
