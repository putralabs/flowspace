import { useUi } from "@/stores/ui";
import { Dialog } from "@/components/ui/dialog";

const shortcuts: [string, string][] = [
  ["/", "Open search"],
  ["C", "Create task (on a project)"],
  ["Ctrl + D", "Go to dashboard"],
  ["Ctrl + P", "Go to projects"],
  ["Ctrl + M", "Go to my tasks"],
  ["Esc", "Close dialogs and panels"],
  ["?", "Show this help"],
];

export function ShortcutsDialog() {
  const shortcutsOpen = useUi((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);

  return (
    <Dialog
      open={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
      title="Keyboard shortcuts"
      description="Shortcuts never trigger while typing in an input."
    >
      <dl className="divide-y divide-border">
        {shortcuts.map(([keys, desc]) => (
          <div key={keys} className="flex items-center justify-between gap-6 py-2.5">
            <dt className="text-[13px] text-text-primary">{desc}</dt>
            <dd>
              <kbd className="rounded-md border border-border bg-surface-secondary px-2 py-0.5 font-sans text-[11px] text-text-secondary">
                {keys}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
