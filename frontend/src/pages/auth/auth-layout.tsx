import { Link, Outlet } from "react-router-dom";
import { Wordmark } from "@/components/ui/logo";

/** Auth shell: broadsheet masthead, bordered form card, quiet footer. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div className="h-[3px] bg-text-primary" aria-hidden="true" />

      <div
        aria-hidden="true"
        className="bg-dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_55%_45%_at_50%_40%,black,transparent)]"
      />

      <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <Link to="/" className="inline-flex" aria-label="Flowspace home">
          <Wordmark size={22} />
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px] rounded-lg border border-border-strong bg-surface p-8 shadow-xs max-sm:p-6">
          <Outlet />
        </div>
      </main>

      <footer className="relative shrink-0 border-t border-border bg-surface">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-center px-6">
          <span className="font-mono text-[11px] tabular-nums text-text-muted">
            &copy; 2026 Flowspace
          </span>
        </div>
      </footer>
    </div>
  );
}
