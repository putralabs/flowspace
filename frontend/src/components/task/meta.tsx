import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDotDashed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityMeta } from "@/lib/constants";
import type { Priority, TaskStatus } from "@/types";

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const cls = cn("shrink-0", className);
  switch (status) {
    case "backlog":
      return <CircleDashed size={14} className={cn(cls, "text-text-muted")} />;
    case "todo":
      return <Circle size={14} className={cn(cls, "text-text-secondary")} />;
    case "in_progress":
      return <CircleDotDashed size={14} className={cn(cls, "text-accent")} />;
    case "review":
      return <CircleDotDashed size={14} className={cn(cls, "text-warning")} />;
    case "done":
      return <CheckCircle2 size={14} className={cn(cls, "text-success")} />;
  }
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  switch (priority) {
    case "none":
      return <span title={priorityMeta.none.label} className="flex w-4 justify-center text-text-muted">-</span>;
    case "low":
      return <ArrowDown size={13} className="text-text-muted" aria-label={priorityMeta.low.label} />;
    case "medium":
      return (
        <span className="flex items-end gap-[1px]" aria-label={priorityMeta.medium.label}>
          <span className="h-2 w-[3px] rounded-sm bg-warning" />
          <span className="h-3 w-[3px] rounded-sm bg-warning" />
        </span>
      );
    case "high":
      return <ArrowUp size={13} className="text-danger" aria-label={priorityMeta.high.label} />;
    case "urgent":
      return <ArrowUpRight size={13} className="text-danger" aria-label={priorityMeta.urgent.label} />;
  }
}
