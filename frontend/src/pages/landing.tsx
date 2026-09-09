import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Pause, Play, Plus } from "lucide-react";
import { Wordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/* ------------------------------ wire fixtures ----------------------------- */

type WireItem = {
  id: number;
  at: string;
  elapsed: string;
  actor: string;
  initials: string;
  text: React.ReactNode;
};

let wireSeq = 0;

const actors = [
  { name: "Andi", initials: "AN" },
  { name: "Putra", initials: "PU" },
  { name: "Budi", initials: "BU" },
  { name: "Sari", initials: "SA" },
];

function stamp(d = new Date()) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function elapsed() {
  const ms = 120 + Math.floor(Math.random() * 360);
  return `t+${(ms / 1000).toFixed(2)}s`;
}

function nextEvent(): Omit<WireItem, "id" | "at"> {
  const a = actors[wireSeq % actors.length];
  switch (wireSeq % 6) {
    case 0:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            moved <em>Authentication flow</em> to <strong>In&nbsp;Progress</strong>
          </>
        ),
      };
    case 1:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            commented on <em>Login screen</em>
          </>
        ),
      };
    case 2:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            assigned <em>Onboarding flow</em> to Budi
          </>
        ),
      };
    case 3:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            moved <em>Navigation IA restructure</em> to <strong>Review</strong>
          </>
        ),
      };
    case 4:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            created <em>Offline caching strategy</em>
          </>
        ),
      };
    default:
      return {
        elapsed: elapsed(),
        actor: a.name,
        initials: a.initials,
        text: (
          <>
            marked <em>Design tokens audit</em> <strong>Done</strong>
          </>
        ),
      };
  }
}

function wibClock(reduced: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [reduced]);
  return now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
}

/* --------------------------------- hooks ---------------------------------- */

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * The signature interaction: the live wire. State lives at module scope so the
 * feed persists across client-side navigation - it only resets on a full page
 * refresh, never on remount, so nothing blinks back to empty.
 */
const useWireStore = create<{ items: WireItem[]; paused: boolean; togglePaused: () => void }>(
  (set) => ({
    items: [],
    paused: false,
    togglePaused: () => set((s) => ({ paused: !s.paused })),
  }),
);

let wireTimer: number | null = null;

function pushWire() {
  useWireStore.setState((s) => ({
    items: [{ id: wireSeq++, at: stamp(), ...nextEvent() }, ...s.items].slice(0, 5),
  }));
}

function startWire() {
  if (wireTimer !== null) return;
  if (useWireStore.getState().items.length === 0) pushWire();
  wireTimer = window.setInterval(pushWire, 2600);
}

function stopWire() {
  if (wireTimer !== null) {
    window.clearInterval(wireTimer);
    wireTimer = null;
  }
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/** Draws the propagation diagram once, when it enters the viewport. */
function useDrawOnView<T extends SVGElement>() {
  const ref = useRef<T | null>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, drawn };
}

/* --------------------------------- chrome ---------------------------------- */

/** Stenciled functional plate: panel furniture, never an eyebrow over a heading. */
function Plate({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "font-wire inline-flex h-5 items-center gap-1 border px-1.5 text-[10px] font-medium tracking-[0.14em]",
        dark
          ? "border-[#4a473a] bg-transparent text-[#b8b39c]"
          : "border-border-strong bg-surface-secondary text-text-muted",
      )}
    >
      {children}
    </span>
  );
}

function LiveStamp({ reduced }: { reduced: boolean }) {
  return (
    <span className="font-wire inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-accent">
      <span className="relative flex h-1.5 w-1.5">
        {!reduced && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      LIVE
    </span>
  );
}

/* ---------------------------------- nav ----------------------------------- */

const navLinks = [
  { href: "#wire", label: "Activity" },
  { href: "#product", label: "How it travels" },
  { href: "#proof", label: "Proof" },
  { href: "#faq", label: "FAQ" },
];

function Nav({ reduced }: { reduced: boolean }) {
  const active = useScrollSpy(["wire", "product", "proof", "faq"]);
  const clock = wibClock(reduced);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" aria-label="Flowspace home">
          <Wordmark size={22} />
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          <nav aria-label="Landing" className="flex gap-1">
            {navLinks.map((l) => {
              const isActive = active === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative px-2 py-1.5 text-[13px] font-medium transition-colors duration-150",
                    isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {l.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 -bottom-[13px] h-[2px] bg-accent transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </a>
              );
            })}
          </nav>

          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <span className="font-wire flex items-center gap-2 text-xs" aria-hidden="true">
            <LiveStamp reduced={reduced} />
            <time className="text-text-muted tabular-nums">{clock} WIB</time>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/auth/login"
            className="whitespace-nowrap px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Log in
          </Link>
          <Link
            to="/auth/register"
            className="inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-md bg-accent px-3.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            <span className="hidden sm:inline">Open your workspace</span>
            <span className="sm:hidden">Open app</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- the wire -------------------------------- */

function WirePanel({ reduced }: { reduced: boolean }) {
  const items = useWireStore((s) => s.items);
  const paused = useWireStore((s) => s.paused);
  const togglePaused = useWireStore((s) => s.togglePaused);
  const frozen = paused || reduced;

  useEffect(() => {
    if (frozen) {
      stopWire();
      return;
    }
    startWire();
    return stopWire;
  }, [frozen]);

  return (
    <section
      id="wire"
      aria-label="Team activity feed"
      className="scroll-mt-20 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-popover"
    >
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Plate>TEAM ACTIVITY</Plate>
          <span className="text-xs font-medium text-text-secondary">Development Team</span>
        </div>
        <button
          type="button"
          onClick={() => togglePaused()}
          aria-pressed={paused}
          title={paused ? "Resume the feed" : "Pause the feed"}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-secondary px-2 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary"
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      <ol className="divide-y divide-border" role="log">
        {items.map((item, i) => (
          <li
            key={item.id}
            className={cn(
              "grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2.5 px-4 py-2.5",
              i > 0 || !reduced ? "animate-slide-up motion-reduce:animate-none" : "",
            )}
          >
            <time className="font-wire text-[11px] tabular-nums text-text-muted">{item.at}</time>
            <span className="font-wire rounded-sm bg-accent-soft px-1 py-0.5 text-[10px] font-medium tabular-nums text-accent">
              {item.elapsed}
            </span>
            <span className="min-w-0 text-[13px] leading-snug text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [&_em]:italic">
              <strong className="font-semibold text-text-primary">{item.actor}</strong> {item.text}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-text-muted">
            Connecting…
          </li>
        )}
      </ol>

      <p className="border-t border-border bg-surface-secondary px-4 py-2 text-[11px] text-text-muted">
        Every move, comment, and assignment is broadcast to every connected teammate in under half
        a second.
      </p>
    </section>
  );
}

/* ---------------------------------- hero ----------------------------------- */

function Hero({ reduced }: { reduced: boolean }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-14 pb-16 lg:grid-cols-[7fr_5fr] lg:gap-14 lg:pt-20 lg:pb-24">
      <div>
        <h1 className="max-w-xl text-[clamp(44px,6.5vw,84px)] leading-[0.98] font-extrabold tracking-[-0.03em] text-text-primary">
          Every desk sees it first.
        </h1>
        <p className="mt-6 max-w-md text-[17px] leading-relaxed text-text-secondary">
          Flowspace is one board that changes for everyone in under half a second. Moves, comments,
          mentions: no refresh, no stale columns, no meeting about the status of statuses.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/auth/register"
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            Open your workspace <ArrowRight size={15} />
          </Link>
          <a
            href="#product"
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-5 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-text-muted"
          >
            How it travels <ArrowDown size={15} />
          </a>
        </div>
        <p className="mt-4 text-[13px] text-text-muted">
          Free for individuals · No credit card · Runs in your browser
        </p>
      </div>

      <WirePanel reduced={reduced} />
    </section>
  );
}

/* ------------------------------ how it travels ----------------------------- */

const arrivals = [
  { client: "Browser · Jakarta", t: "t+0.31s" },
  { client: "Browser · Bandung", t: "t+0.42s" },
  { client: "Phone · Surabaya", t: "t+0.48s" },
];

function TravelDiagram({ reduced }: { reduced: boolean }) {
  const { ref, drawn } = useDrawOnView<SVGSVGElement>();
  const shown = reduced || drawn;

  return (
    <div className="mt-10">
      {/* Desktop: the fan-out diagram */}
      <svg
        ref={ref}
        viewBox="0 0 720 240"
        className="hidden w-full md:block"
        role="img"
        aria-label="One task move propagating to three clients with arrival times"
      >
      {/* source card */}
      <g>
        <rect x="8" y="92" width="168" height="56" rx="6" className="fill-[#26241c]" stroke="#55523f" />
        <text x="24" y="116" className="fill-[#f7f6f2] text-[13px] font-semibold" fontFamily="'Libre Franklin', sans-serif">
          Authentication flow
        </text>
        <text x="24" y="134" className="fill-[#b8b39c] text-[11px]" fontFamily="'JetBrains Mono', monospace">
          Review · moved by Andi
        </text>
      </g>

      {/* fan-out tracks */}
      {[46, 120, 194].map((y, i) => (
        <path
          key={y}
          d={`M176 ${120} C ${300} ${120}, ${320} ${y + 12}, ${430} ${y + 12}`}
          fill="none"
          strokeWidth="1.5"
          className="stroke-[#6f6c58]"
          strokeDasharray="360"
          strokeDashoffset={shown ? 0 : 360}
          style={{
            transition: reduced ? "none" : `stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1) ${i * 140}ms`,
          }}
        />
      ))}

      {/* client frames */}
      {arrivals.map((a, i) => {
        const y = [34, 108, 182][i];
        return (
          <g key={a.client}>
            <rect x="430" y={y} width="282" height="36" rx="6" className="fill-[#26241c]" stroke="#55523f" />
            <circle cx="450" cy={y + 18} r="4" className={shown ? "fill-[#6d64f0]" : "fill-[#55523f]"} style={{ transition: reduced ? "none" : "fill 400ms ease-out 700ms" }} />
            <text x="464" y={y + 23} className="fill-[#e9e6da] text-[12px]" fontFamily="'Libre Franklin', sans-serif">
              {a.client}
            </text>
            <text x="702" y={y + 23} textAnchor="end" className="fill-[#8f8aff] text-[11px] tabular-nums" fontFamily="'JetBrains Mono', monospace">
              {a.t}
            </text>
          </g>
        );
      })}
      </svg>

      {/* Mobile: the same event as a stacked manifest */}
      <ol className="mt-8 space-y-2 md:hidden">
        <li className="rounded-md border border-[#55523f] bg-[#26241c] px-3.5 py-3">
          <p className="text-sm font-semibold text-[#f7f6f2]">Authentication flow</p>
          <p className="font-wire mt-0.5 text-[11px] text-[#b8b39c]">Review · moved by Andi</p>
        </li>
        {arrivals.map((a) => (
          <li
            key={a.client}
            className="flex items-center justify-between gap-3 rounded-md border border-[#3a382c] bg-[#1d1c15] px-3.5 py-2.5"
          >
            <span className="flex items-center gap-2.5 text-[13px] text-[#e9e6da]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#6d64f0]" />
              {a.client}
            </span>
            <span className="font-wire text-[11px] tabular-nums text-[#8f8aff]">{a.t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HowItTravels({ reduced }: { reduced: boolean }) {
  const rows = [
    {
      term: "Broadcast",
      desc: "A move is sent once over the WebSocket and fanned out to every open board. Nobody polls; nothing waits for a refresh.",
    },
    {
      term: "Optimistic",
      desc: "Your own card moves instantly, before the network answers. If the server disagrees, the update rolls back cleanly instead of sticking.",
    },
    {
      term: "Recorded",
      desc: "Every accepted change lands on the project's activity trail with an actor and a timestamp, so yesterday's argument ends today.",
    },
  ];

  return (
    <section id="product" className="scroll-mt-16 bg-text-primary text-[#f7f6f2]">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <h2 className="max-w-xl text-[clamp(30px,4vw,48px)] leading-[1.04] font-bold tracking-[-0.02em]">
          One move. Every screen.
        </h2>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-[#b8b39c]">
          Drag a card in Jakarta and it lands in Bandung before you let go of the mouse. This is
          what under-half-a-second actually looks like.
        </p>

        <TravelDiagram reduced={reduced} />

        <dl className="mt-14 grid gap-x-14 gap-y-8 border-t border-[#3a382c] pt-10 md:grid-cols-3">
          {rows.map((r) => (
            <div key={r.term}>
              <dt className="text-[15px] font-semibold text-[#f7f6f2]">{r.term}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[#b8b39c]">{r.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------- proof wall ------------------------------- */

function MiniBoard() {
  const cols = [
    { name: "Todo", cards: ["Hero section concepts", "Contact form validation"] },
    { name: "In Progress", cards: ["Authentication flow"] },
    { name: "Review", cards: ["Navigation IA restructure", "Login screen"] },
    { name: "Done", cards: ["Design tokens audit", "Crash reporting"] },
  ];
  return (
    <div className="grid grid-cols-4 gap-2" aria-hidden="true">
      {cols.map((c) => (
        <div key={c.name}>
          <p className="font-wire mb-1.5 text-[9px] tracking-[0.12em] text-text-muted">{c.name.toUpperCase()}</p>
          <div className="space-y-1.5">
            {c.cards.map((t) => (
              <div key={t} className="rounded-md border border-border bg-background p-2 text-[10px] leading-snug font-medium text-text-primary">
                {t}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniThread() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div>
        <p className="text-xs">
          <strong className="font-semibold text-text-primary">Putra</strong>{" "}
          <time className="font-wire text-[10px] text-text-muted">10:42</time>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">
          @Andi authentication flow masih perlu dicek untuk mobile.
        </p>
      </div>
      <div>
        <p className="text-xs">
          <strong className="font-semibold text-text-primary">Andi</strong>{" "}
          <time className="font-wire text-[10px] text-text-muted">10:45</time>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Sudah saya update.</p>
      </div>
      <p className="text-[11px] italic text-text-muted">Andi is typing…</p>
    </div>
  );
}

function MiniRecord() {
  const rows = [
    ["Budi", "moved task to review", "10:31"],
    ["Andi", "assigned task to Budi", "09:54"],
    ["Sari", "commented on", "09:12"],
  ];
  return (
    <ol aria-hidden="true">
      {rows.map(([who, action, time], i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-0">
          <p className="truncate text-[13px] text-text-secondary">
            <strong className="font-semibold text-text-primary">{who}</strong> {action}
          </p>
          <time className="font-wire shrink-0 text-[10px] tabular-nums text-text-muted">{time}</time>
        </li>
      ))}
    </ol>
  );
}

function ProofWall() {
  const cells = [
    { plate: "BOARD", body: <MiniBoard />, note: "Five columns you can reshape." },
    { plate: "THREAD", body: <MiniThread />, note: "Decisions happen next to the work." },
    { plate: "RECORD", body: <MiniRecord />, note: "A quiet trail of everything." },
  ];

  return (
    <section id="proof" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <h2 className="max-w-xl text-[clamp(30px,4vw,48px)] leading-[1.04] font-bold tracking-[-0.02em] text-text-primary">
          The product, packed edge to edge.
        </h2>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-text-secondary">
          No staged screenshots. These are the working surfaces your team lives in, drawn from a
          real workspace.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-strong bg-border md:grid-cols-3">
          {cells.map((c) => (
            <figure key={c.plate} className="flex flex-col bg-surface p-5">
              <Plate>{c.plate}</Plate>
              <div className="mt-4 flex-1">{c.body}</div>
              <figcaption className="mt-5 border-t border-border pt-3 text-[13px] text-text-secondary">
                {c.note}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- faq ----------------------------------- */

const faqs = [
  {
    q: "How realtime is “realtime”?",
    a: "Task moves, comments, reactions, and notifications are broadcast the moment they happen. Under normal conditions every teammate sees a change within half a second, without refreshing.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. Individuals can create a workspace, invite teammates, and run projects for free. You only think about billing when your team outgrows the free tier.",
  },
  {
    q: "Can guests see only some projects?",
    a: "Yes. Guests are scoped to the specific projects they are invited to and can only comment when given permission. Owners and admins control every seat.",
  },
  {
    q: "What happens if my connection drops?",
    a: "Flowspace tells you plainly when the connection drops, then confirms “Back online” once it returns. Optimistic updates roll back instead of leaving the board stuck.",
  },
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-6 pb-24">
      <h2 className="text-[clamp(26px,3vw,34px)] leading-tight font-bold tracking-[-0.02em] text-text-primary">
        Asked, answered.
      </h2>
      <div className="mt-8 divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
              {f.q}
              <Plus
                size={16}
                aria-hidden="true"
                className="shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="pr-8 pb-5 text-[14px] leading-relaxed text-text-secondary">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- final cta -------------------------------- */

function FinalCta() {
  return (
    <section className="border-t border-border" aria-label="Get started">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
        <h2 className="mx-auto max-w-2xl text-[clamp(32px,4.5vw,52px)] leading-[1.04] font-bold tracking-[-0.02em] text-text-primary">
          Bring your team into one space.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-text-secondary">
          Create a workspace in under a minute. Invite the people you work with. Watch every move
          land together.
        </p>
        <Link
          to="/auth/register"
          className="mt-8 inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-accent px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Open your workspace <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-10">
        <Wordmark size={20} />
        <p className="font-wire text-[11px] tabular-nums text-text-muted">&copy; 2026 Flowspace</p>
      </div>
    </footer>
  );
}

/* ---------------------------------- page ----------------------------------- */

export function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="wire-root font-news min-h-dvh bg-background text-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      {/* broadsheet top rule */}
      <div className="h-[3px] bg-text-primary" aria-hidden="true" />

      <Nav reduced={reduced} />

      <main id="main">
        <Hero reduced={reduced} />
        <HowItTravels reduced={reduced} />
        <ProofWall />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
