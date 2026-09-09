import { create } from "zustand";

export interface TypingEntry {
  userId: number;
  userName: string;
  taskId: number | null;
  expiresAt: number;
}

interface RealtimeState {
  onlineUserIds: Record<number, true>;
  typing: TypingEntry[];
  setOnline: (ids: number[]) => void;
  addOnline: (id: number) => void;
  removeOnline: (id: number) => void;
  markTyping: (entry: Omit<TypingEntry, "expiresAt">) => void;
  removeTyping: (userId: number, taskId: number | null) => void;
  pruneTyping: () => void;
  reset: () => void;
}

export const useRealtime = create<RealtimeState>((set) => ({
  onlineUserIds: {},
  typing: [],
  setOnline: (ids) =>
    set({ onlineUserIds: Object.fromEntries(ids.map((id) => [id, true as const])) }),
  addOnline: (id) => set((s) => ({ onlineUserIds: { ...s.onlineUserIds, [id]: true as const } })),
  removeOnline: (id) =>
    set((s) => {
      const next = { ...s.onlineUserIds };
      delete next[id];
      return { onlineUserIds: next };
    }),
  markTyping: (entry) =>
    set((s) => ({
      typing: [
        ...s.typing.filter(
          (t) => !(t.userId === entry.userId && t.taskId === entry.taskId),
        ),
        { ...entry, expiresAt: Date.now() + 3500 },
      ],
    })),
  removeTyping: (userId, taskId) =>
    set((s) => ({
      typing:
        taskId === null
          ? s.typing.filter((t) => t.userId !== userId)
          : s.typing.filter((t) => !(t.userId === userId && t.taskId === taskId)),
    })),
  pruneTyping: () =>
    set((s) => {
      const now = Date.now();
      return s.typing.some((t) => t.expiresAt < now)
        ? { typing: s.typing.filter((t) => t.expiresAt >= now) }
        : s;
    }),
  reset: () => set({ onlineUserIds: {}, typing: [] }),
}));
