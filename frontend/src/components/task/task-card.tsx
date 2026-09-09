import { CalendarDays } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { LabelChip } from "@/components/ui/badge";
import { PriorityIcon } from "./meta";
import { initialsOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { dueLabel } from "@/lib/format";

export function TaskCard({
  task,
  onOpen,
  overlay,
}: {
  task: Task;
  onOpen?: () => void;
  overlay?: boolean;
}) {
  const taskLabels = task.labels ?? [];
  const due = dueLabel(task.due_date);
  const taskNo = String(task.id);

  return (
    <div
      role={overlay ? undefined : "button"}
      tabIndex={overlay ? undefined : 0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.();
      }}
      className={cn(
        "group rounded-lg border border-border bg-surface p-3 transition-all duration-150",
        !overlay &&
          "cursor-pointer hover:-translate-y-px hover:border-border-strong hover:shadow-xs focus-visible:outline-2 focus-visible:outline-accent",
        overlay && "rotate-[2deg] shadow-popover",
      )}
      aria-label={`Task ${task.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug font-medium text-text-primary">{task.title}</p>
        <span
          aria-hidden="true"
          className="mt-px shrink-0 font-mono text-[10px] text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          FS-{taskNo.padStart(3, "0")}
        </span>
      </div>

      {taskLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {taskLabels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <PriorityIcon priority={task.priority} />
          {task.assignee && (
            <Avatar initials={initialsOf(task.assignee.name)} seed={task.assignee.name} src={task.assignee.avatar_url} alt={task.assignee.name} size="sm" />
          )}
        </span>
        {due.text && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              due.tone === "danger" && "text-danger",
              due.tone === "warn" && "text-warning",
              due.tone === "muted" && "text-text-muted",
            )}
          >
            <CalendarDays size={11} />
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}
