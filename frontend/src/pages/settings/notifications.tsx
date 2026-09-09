import { useState } from "react";
import { cn } from "@/lib/utils";

function Toggle({ defaultOn, label }: { defaultOn?: boolean; label: string }) {
  const [on, setOn] = useState(Boolean(defaultOn));
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150",
        on ? "bg-accent" : "bg-border-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-150",
          on && "translate-x-4",
        )}
      />
    </button>
  );
}

function Row({ title, description, defaultOn }: { title: string; description: string; defaultOn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3.5 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      <Toggle label={title} defaultOn={defaultOn} />
    </div>
  );
}

export function NotificationsSettings() {
  return (
    <div className="max-w-lg">
      <section aria-label="Notification preferences">
        <h2 className="mb-1 text-[13px] font-semibold text-text-primary">In-app notifications</h2>
        <div className="rounded-lg border border-border bg-surface px-4">
          <Row title="Mentions" description="When someone @mentions you in a task or comment." />
          <Row title="Task assigned" description="When a task is assigned to you." />
          <Row title="Comments and replies" description="Replies to your comments and threads you follow." />
          <Row title="Due soon" description="Reminders for tasks due within 24 hours." />
        </div>
      </section>

      <section aria-label="Email digest" className="mt-8">
        <h2 className="mb-1 text-[13px] font-semibold text-text-primary">Email</h2>
        <div className="rounded-lg border border-border bg-surface px-4">
          <Row title="Weekly digest" description="A Monday summary of your work across projects." defaultOn={false} />
          <Row title="Invitations" description="Workspace and project invitations by email." />
        </div>
      </section>
    </div>
  );
}
