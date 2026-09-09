import { create } from "zustand";
import { authService, type MePayload } from "@/services/auth";
import { setToken, getToken } from "@/services/api";
import { resetEcho } from "@/websocket/echo";
import { queryClient } from "@/lib/query-client";
import { useUi } from "./ui";
import { useRealtime } from "./realtime";

/** Drop everything tied to the previous account: API cache + selected workspace. */
function resetAccountState() {
  queryClient.clear();
  useUi.getState().setActiveWorkspace(null);
}

/** Point the workspace selector at the new account's first workspace. */
function adoptWorkspaces(workspaces: MePayload["workspaces"]) {
  const active = useUi.getState().activeWorkspaceId;
  if (!active || !workspaces.some((w) => w.id === active)) {
    useUi.getState().setActiveWorkspace(workspaces[0]?.id ?? null);
  }
}

interface AuthState {
  user: MePayload["user"] | null;
  workspaces: MePayload["workspaces"];
  status: "idle" | "loading" | "ready";
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, invitationToken?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: MePayload["user"]) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  workspaces: [],
  status: "idle",

  init: async () => {
    if (!getToken()) {
      set({ status: "ready", user: null, workspaces: [] });
      return;
    }
    try {
      const data = await authService.me();
      set({ user: data.user, workspaces: data.workspaces, status: "ready" });
      adoptWorkspaces(data.workspaces);
    } catch {
      setToken(null);
      set({ user: null, workspaces: [], status: "ready" });
    }
  },

  login: async (email, password) => {
    resetAccountState();
    const data = await authService.login({ email, password });
    setToken(data.token);
    resetEcho();
    set({ user: data.user });
    const me = await authService.me().catch(() => null);
    set({ workspaces: me?.workspaces ?? [], status: "ready" });
    adoptWorkspaces(me?.workspaces ?? []);
  },

  register: async (name, email, password, invitationToken = null) => {
    resetAccountState();
    const data = await authService.register({
      name,
      email,
      password,
      invitation_token: invitationToken ?? undefined,
    });
    setToken(data.token);
    resetEcho();
    set({ user: data.user, workspaces: [], status: "ready" });
    adoptWorkspaces([]);
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // token may already be revoked; clear locally regardless
    }
    setToken(null);
    resetEcho();
    useRealtime.getState().reset();
    resetAccountState();
    set({ user: null, workspaces: [] });
  },

  setUser: (user) => set({ user }),

  clear: () => {
    setToken(null);
    resetEcho();
    resetAccountState();
    set({ user: null, workspaces: [], status: "ready" });
  },
}));
