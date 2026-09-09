import { create } from "zustand";

type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  commandOpen: boolean;
  shortcutsOpen: boolean;
  composerOpen: boolean;
  activeWorkspaceId: number | null;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setComposerOpen: (open: boolean) => void;
  setActiveWorkspace: (id: number | null) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const stored = (typeof localStorage !== "undefined" && localStorage.getItem("flowspace-theme")) as Theme | null;
const initial: Theme = stored ?? "light";
applyTheme(initial);

const WORKSPACE_KEY = "flowspace-workspace";

function storedWorkspaceId(): number | null {
  if (typeof localStorage === "undefined") return null;
  const id = Number(localStorage.getItem(WORKSPACE_KEY));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export const useUi = create<UiState>((set, get) => ({
  theme: initial,
  sidebarOpen: false,
  commandOpen: false,
  shortcutsOpen: false,
  composerOpen: false,
  activeWorkspaceId: storedWorkspaceId(),
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("flowspace-theme", next);
    set({ theme: next });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setComposerOpen: (composerOpen) => set({ composerOpen }),
  setActiveWorkspace: (activeWorkspaceId) => {
    if (typeof localStorage !== "undefined") {
      if (activeWorkspaceId) localStorage.setItem(WORKSPACE_KEY, String(activeWorkspaceId));
      else localStorage.removeItem(WORKSPACE_KEY);
    }
    set({ activeWorkspaceId });
  },
}));
