const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function dueLabel(due: string | null): { text: string; tone: "muted" | "warn" | "danger" } {
  if (!due) return { text: "", tone: "muted" };
  const [y, m, day] = due.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  if (target.getTime() === today.getTime()) return { text: "Due today", tone: "danger" };
  if (target.getTime() === today.getTime() + 86400000) return { text: "Due tomorrow", tone: "warn" };
  if (target < today && target.getTime() !== today.getTime()) {
    const past = Math.round((today.getTime() - target.getTime()) / 86400000);
    return { text: `Overdue ${past}d`, tone: "danger" };
  }
  return { text: `${MONTHS[d.getMonth()]} ${d.getDate()}`, tone: "muted" };
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return formatShort(d);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function weekdayShort(i: number) {
  return DAYS[i];
}
