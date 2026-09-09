import type { Task } from "@/types";
import { statusMeta } from "@/lib/constants";
import { StatusIcon, PriorityIcon } from "@/components/task/meta";
import { Avatar } from "@/components/ui/avatar";
import { LabelChip } from "@/components/ui/badge";
import { initialsOf } from "@/lib/constants";
import { dueLabel, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ListView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const sorted = [...tasks].sort((a, b) => a.status.localeCompare(b.status) || a.position - b.position);

  return (
    <div className="px-6 pb-6 max-md:px-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left">
          <caption className="sr-only">Task list</caption>
          <thead>
            <tr className="border-b border-border bg-surface-secondary/60 text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              <th scope="col" className="px-4 py-2.5 font-semibold">Task</th>
              <th scope="col" className="hidden w-28 px-3 py-2.5 font-semibold sm:table-cell">Status</th>
              <th scope="col" className="hidden w-24 px-3 py-2.5 font-semibold md:table-cell">Priority</th>
              <th scope="col" className="hidden w-32 px-3 py-2.5 font-semibold lg:table-cell">Labels</th>
              <th scope="col" className="w-24 px-3 py-2.5 font-semibold">Assignee</th>
              <th scope="col" className="w-24 px-3 py-2.5 font-semibold">Due date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const assigneeName = t.assignee?.name;
              const due = dueLabel(t.due_date);
              return (
                <tr
                  key={t.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open task ${t.title}`}
                  onClick={() => onOpen(t)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(t)}
                  className="cursor-pointer border-b border-border transition-colors duration-100 last:border-0 hover:bg-surface-secondary/50 focus-visible:bg-surface-secondary"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <StatusIcon status={t.status} />
                      <span className="truncate text-[13px] font-medium text-text-primary">{t.title}</span>
                    </span>
                    {(t.labels?.length ?? 0) > 0 && (
                      <span className="mt-1 flex gap-1.5 sm:hidden">
                        {t.labels!.map((l) => (
                          <LabelChip key={l.id} label={l} />
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2.5 text-[13px] text-text-secondary sm:table-cell">
                    {statusMeta[t.status].label}
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell" title={t.priority}>
                    <PriorityIcon priority={t.priority} />
                  </td>
                  <td className="hidden px-3 py-2.5 lg:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {t.labels?.slice(0, 2).map((l) => (
                        <LabelChip key={l.id} label={l} />
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {assigneeName && (
                      <Avatar initials={initialsOf(assigneeName)} seed={assigneeName} src={t.assignee?.avatar_url} alt={assigneeName} size="sm" />
                    )}
                  </td>
                  <td className={cn("px-3 py-2.5 text-[12px]", due.tone === "danger" ? "text-danger" : "text-text-secondary")}>
                    {shortDate(t.due_date) || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-text-muted">No tasks match the current filters.</p>
        )}
      </div>
    </div>
  );
}
