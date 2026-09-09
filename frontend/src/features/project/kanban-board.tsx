import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { statusMeta, statusOrder } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";
import { SortableTaskCard, TaskCard } from "@/components/task/task-card";
import { StatusIcon } from "@/components/task/meta";
import { cn } from "@/lib/utils";

interface KanbanProps {
  tasks: Task[];
  onMove: (taskId: number, status: TaskStatus, position: number) => void;
  onOpenTask: (task: Task) => void;
  onQuickAdd?: (status: TaskStatus) => void;
}

function findStatus(tasks: Task[], id: number | string): TaskStatus | undefined {
  const numId = Number(id);
  return tasks.find((t) => t.id === numId)?.status;
}

export function KanbanBoard({ tasks, onMove, onOpenTask, onQuickAdd }: KanbanProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<Record<string, number[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    for (const s of statusOrder) {
      map[s].sort((a, b) => a.position - b.position);
      const order = localOrder[s];
      if (order) map[s].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, localOrder]);

  const activeTask = activeId != null ? tasks.find((t) => t.id === activeId) : undefined;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdNum = Number(active.id);
    const overIdStr = String(over.id);

    const from = findStatus(tasks, activeIdNum);
    let to: TaskStatus | undefined;
    if (overIdStr.startsWith("col-")) to = overIdStr.slice(4) as TaskStatus;
    else to = findStatus(tasks, overIdStr);

    if (!from || !to || from === to) return;

    setLocalOrder((prev) => {
      const next = { ...prev };
      const fromIds = byStatus[from].map((t) => t.id);
      const toIds = to !== from ? byStatus[to].map((t) => t.id) : fromIds;
      const target = to !== from ? to : from;
      next[from] = fromIds.filter((id) => id !== activeIdNum);
      const overIndex = overIdStr.startsWith("col-")
        ? toIds.length
        : Math.max(toIds.indexOf(Number(overIdStr)), 0);
      const insert = [...toIds];
      insert.splice(Math.min(overIndex, insert.length), 0, activeIdNum);
      next[target] = Array.from(new Set(insert));
      return next;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const id = Number(active.id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const currentList = Object.entries(localOrder).find(([, ids]) => ids.includes(id));
    let finalStatus: TaskStatus = task.status;
    let position = task.position;

    if (currentList) {
      const [statusKey, ids] = currentList as [TaskStatus, number[]];
      finalStatus = statusKey;
      position = ids.indexOf(id);
    } else {
      const overIdStr = String(over.id);
      if (overIdStr.startsWith("col-")) {
        finalStatus = overIdStr.slice(4) as TaskStatus;
        position = byStatus[finalStatus].length;
      }
    }

    if (finalStatus === task.status && position === task.position) return;
    onMove(id, finalStatus, position);
    setLocalOrder({});
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setLocalOrder({})}
    >
      <div className="kanban-scroll flex min-h-0 flex-1 gap-4 overflow-auto px-6 pt-1 pb-4 max-md:px-4">
        {statusOrder.map((status) => {
          const items = byStatus[status];
          return (
            <section
              key={status}
              aria-label={`${statusMeta[status].label} column`}
              className="flex w-[280px] shrink-0 flex-col rounded-lg bg-background"
            >
              <header className="flex items-center gap-2 px-3 pt-1 pb-2.5">
                <StatusIcon status={status} />
                <h3 className="text-[13px] font-semibold text-text-primary">
                  {statusMeta[status].label}
                </h3>
                <span className="font-mono text-[11px] text-text-secondary">{items.length}</span>
                {onQuickAdd && status !== "done" && (
                  <button
                    type="button"
                    onClick={() => onQuickAdd(status)}
                    aria-label={`Add task to ${statusMeta[status].label}`}
                    className="ml-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors duration-100 hover:bg-surface-secondary hover:text-text-primary"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </header>
              <SortableContext
                items={[`col-${status}`, ...items.map((t) => t.id)]}
                strategy={verticalListSortingStrategy}
              >
                <div
                  data-status={status}
                  className={cn(
                    "flex min-h-16 flex-1 flex-col gap-2 rounded-lg p-2 transition-colors duration-150",
                    activeId != null && "bg-surface-secondary/60",
                  )}
                >
                  {items.map((t) => (
                    <SortableTaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
                  ))}
                </div>
              </SortableContext>
            </section>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
