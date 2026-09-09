import { cn } from "@/lib/utils";
import type { Presence } from "@/types";

const presenceColor: Record<Presence, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-text-muted",
};

function hueFrom(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  presence?: Presence;
  seed?: string;
  src?: string | null;
  alt?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({ initials, size = "md", presence, seed, src, alt, className }: AvatarProps) {
  const hue = hueFrom(seed ?? initials);
  return (
    <span
      style={{ "--av-h": hue } as React.CSSProperties}
      className={cn("relative inline-flex shrink-0", className)}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? initials}
          className={cn("inline-flex items-center justify-center rounded-full object-cover", sizeMap[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-[hsl(var(--av-h),42%,90%)] font-medium text-[hsl(var(--av-h),40%,30%)] dark:bg-[hsl(var(--av-h),26%,30%)] dark:text-[hsl(var(--av-h),38%,80%)]",
            sizeMap[size],
          )}
        >
          {initials}
        </span>
      )}
      {presence && presence !== "offline" && (
        <span
          className={cn(
            "absolute right-0 bottom-0 h-2 w-2 rounded-full ring-2 ring-surface",
            presenceColor[presence],
          )}
          title={presence}
        />
      )}
      <span className="sr-only">{initials}</span>
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
}: {
  people: { initials: string; name: string; avatar_url?: string | null }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.name} initials={p.initials} seed={p.name} src={p.avatar_url} alt={p.name} size="sm" className="rounded-full ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-medium text-text-muted ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  );
}
