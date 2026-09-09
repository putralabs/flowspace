import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FolderKanban, ListChecks, Search, User } from "lucide-react";
import { useUi } from "@/stores/ui";
import { useSearch } from "@/hooks/queries";
import { projectUrl, slugify } from "@/lib/constants";

export function CommandPalette() {
  const commandOpen = useUi((s) => s.commandOpen);
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (commandOpen) {
      setQuery("");
      setDebounced("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandOpen]);

  // Debounced search (PRD §35).
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const searchQuery = useSearch(debounced);
  const results = searchQuery.data;

  type Row =
    | { kind: "Project"; id: string; label: string; sub: string; to: string; icon: typeof FolderKanban }
    | { kind: "Task"; id: string; label: string; sub: string; to: string; icon: typeof ListChecks }
    | { kind: "Member"; id: string; label: string; sub: string; to: string; icon: typeof User };

  const rows: Row[] = useMemo(() => {
    if (!results || !debounced) return [];
    return [
      ...results.projects.map(
        (p): Row => ({
          kind: "Project",
          id: `p-${p.id}`,
          label: p.name,
          sub: "Project",
          to: projectUrl({ id: p.id, slug: (p as { slug?: string }).slug, name: p.name }),
          icon: FolderKanban,
        }),
      ),
      ...results.tasks.map(
        (t): Row => ({
          kind: "Task",
          id: `t-${t.id}`,
          label: t.title,
          sub: t.project?.name ?? "Task",
          to: `/projects/${t.project?.slug || (t as { project_slug?: string }).project_slug || slugify(t.project?.name || "") || t.project_id}/board`,
          icon: ListChecks,
        }),
      ),
      ...results.members.map(
        (m): Row => ({
          kind: "Member",
          id: `u-${m.id}`,
          label: m.name,
          sub: m.email,
          to: "/workspaces",
          icon: User,
        }),
      ),
    ].slice(0, 12);
  }, [results, debounced]);

  return (
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/30"
            onClick={() => setCommandOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search size={16} className="shrink-0 text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCommandOpen(false);
                  if (e.key === "Enter" && rows[0]) {
                    navigate(rows[0].to);
                    setCommandOpen(false);
                  }
                }}
                placeholder="Search projects, tasks, members..."
                className="h-12 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                aria-label="Search anything"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5" aria-busy={searchQuery.isFetching}>
              {debounced.length > 1 && rows.length === 0 && !searchQuery.isFetching && (
                <p className="px-3 py-8 text-center text-[13px] text-text-muted">
                  No results for &ldquo;{debounced}&rdquo;
                </p>
              )}
              {rows.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => {
                    navigate(r.to);
                    setCommandOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors duration-100 hover:bg-surface-secondary"
                >
                  <r.icon size={15} className="shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{r.label}</span>
                  <span className="max-w-32 truncate text-[11px] text-text-muted">{r.sub}</span>
                  <span className="text-[11px] text-text-muted">{r.kind}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
