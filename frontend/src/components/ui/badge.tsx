import { cn } from "@/lib/utils";
import type { Label } from "@/types";

export function Badge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={
        color
          ? { backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <Badge color={label.color}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
    </Badge>
  );
}
