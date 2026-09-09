import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUi } from "@/stores/ui";

export function useShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);
  const setComposerOpen = useUi((s) => s.setComposerOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (typing) {
        if (e.key === "Escape") (target as HTMLInputElement).blur();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (location.pathname.startsWith("/projects/")) {
          e.preventDefault();
          setComposerOpen(true);
        }
        return;
      }

      if (!e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "d") {
        e.preventDefault();
        navigate("/dashboard");
      } else if (key === "p") {
        e.preventDefault();
        navigate("/projects");
      } else if (key === "m") {
        e.preventDefault();
        navigate("/my-tasks");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, location.pathname, setCommandOpen, setShortcutsOpen, setComposerOpen]);
}
