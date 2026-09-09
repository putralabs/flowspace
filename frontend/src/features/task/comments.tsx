import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Reply, Trash2, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentService } from "@/services/tasks";
import { projectService } from "@/services/workspaces";
import { firstErrorMessage } from "@/services/api";
import { qk, useComments } from "@/hooks/queries";
import { useAuth } from "@/stores/auth";
import { useRealtime } from "@/stores/realtime";
import type { ActivityItem, Comment } from "@/types";
import { clockTime } from "@/lib/format";
import { initialsOf } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";

const TYPING_DEBOUNCE = 1200;
const MAX_THREAD_DEPTH = 4;

interface MentionOption {
  id: number;
  name: string;
  label: string;
  hint?: string;
  everyone?: boolean;
  avatar_url?: string | null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bold only the @mention spans, leaving the rest of the text as-is. */
function renderMentionBody(body: string, names: string[]): ReactNode {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return body;
  const pattern = new RegExp(`(^|\\s)@(${sorted.map(escapeRegExp).join("|")})`, "gi");
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = pattern.exec(body)) !== null) {
    const at = m.index + m[1].length;
    if (at > last) nodes.push(body.slice(last, at));
    nodes.push(
      <strong key={k++} className="font-semibold text-text-primary">
        @{m[2]}
      </strong>,
    );
    last = at + m[2].length + 1;
    if (m[0].length === 0) break;
  }
  nodes.push(body.slice(last));
  return nodes;
}

export function CommentList({
  projectId,
  taskId,
  members,
  onError,
}: {
  projectId: number | string;
  taskId: number;
  members: { id: number; name: string; avatar_url?: string | null }[];
  onError: (message: string) => void;
}) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const typingEntries = useRealtime((s) => s.typing);
  const commentsQuery = useComments(taskId);
  const comments = commentsQuery.data ?? [];

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [mention, setMention] = useState<{ query: string; start: number; end: number; index: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Members matching the current @query (substring, case-insensitive),
  // plus a synthetic @everyone entry on top. Already-mentioned people are
  // left out so the same person cannot be mentioned twice.
  const mentionOptions = useMemo<MentionOption[]>(() => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();
    const drafted = draft.toLowerCase();
    const matches = (name: string) => q === "" || name.toLowerCase().includes(q);
    const list: MentionOption[] = [];
    if (matches("everyone") && !drafted.includes("@everyone")) {
      list.push({ id: -1, name: "everyone", label: "Everyone", hint: "Notify all members", everyone: true });
    }
    // Never suggest yourself; self-mentions notify nobody.
    for (const m of members) {
      if (m.id === me?.id) continue;
      if (!matches(m.name)) continue;
      if (drafted.includes(`@${m.name.toLowerCase()}`)) continue;
      list.push({ id: m.id, name: m.name, label: m.name, avatar_url: m.avatar_url });
    }
    return list.slice(0, 7);
  }, [mention, members, me?.id, draft]);

  // Names bolded inside posted comments (longest first is handled in the helper).
  const mentionNames = useMemo(
    () => [...members.map((m) => m.name), "everyone"],
    [members],
  );

  /** Track an @mention token right before the caret. */
  function updateMention(value: string, caret: number | null) {
    if (caret == null) {
      setMention(null);
      return;
    }
    const before = value.slice(0, caret);
    const match = /@([\w.\- ]*)$/.exec(before);
    if (!match) {
      setMention(null);
      return;
    }
    // The @ must start the text or follow whitespace, otherwise it is an email or similar.
    if (match.index > 0 && !/\s/.test(before[match.index - 1])) {
      setMention(null);
      return;
    }
    setMention({
      query: match[1],
      start: match.index,
      end: caret,
      index: 0,
    });
  }

  function pickMention(m: { id: number; name: string }) {
    if (!mention) return;
    const next = `${draft.slice(0, mention.start)}@${m.name} ${draft.slice(mention.end)}`;
    const caret = mention.start + m.name.length + 2;
    setDraft(next);
    setMention(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  }

  // Debounced typing broadcast (PRD §15).
  const typingTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  function broadcastTyping() {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      void projectService.typing(projectId, taskId).catch(() => undefined);
    }, TYPING_DEBOUNCE);
  }

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: qk.comments(taskId) });
    void qc.invalidateQueries({ queryKey: qk.activities(projectId) });
  };

  const addMutation = useMutation({
    mutationFn: (input: { body: string; parent_id: number | null }) =>
      commentService.create(taskId, input),
    onSuccess: () => {
      setDraft("");
      setReplyTo(null);
      setMention(null);
      invalidate();
    },
    onError: (err) => onError(firstErrorMessage(err)),
  });

  const editMutation = useMutation({
    mutationFn: (input: { id: number; body: string }) => commentService.update(input.id, input.body),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (err) => onError(firstErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => commentService.remove(id),
    onSuccess: invalidate,
    onError: (err) => onError(firstErrorMessage(err)),
  });

  const remoteTyping = useMemo(
    () =>
      typingEntries.find(
        (t) => (t.taskId === taskId || t.taskId === null) && t.userId !== me?.id,
      ),
    [typingEntries, taskId, me?.id],
  );

  function submit() {
    const body = draft.trim();
    if (!body) return;
    addMutation.mutate({ body, parent_id: replyTo?.id ?? null });
  }

  // Threaded view: replies spawn under the comment they answer (TikTok/FB style).
  const { tops, childrenOf, byId } = useMemo(() => {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const childrenOf = new Map<number, Comment[]>();
    const tops: Comment[] = [];
    for (const c of comments) {
      if (c.parent_id != null && byId.has(c.parent_id)) {
        const list = childrenOf.get(c.parent_id) ?? [];
        list.push(c);
        childrenOf.set(c.parent_id, list);
      } else {
        tops.push(c);
      }
    }
    return { tops, childrenOf, byId };
  }, [comments]);

  function renderThread(c: Comment, depth: number) {
    const item = (
      <CommentItem
        key={c.id}
        comment={c}
        meId={me?.id ?? null}
        mentionNames={mentionNames}
        replyToName={
          c.parent_id != null ? (byId.get(c.parent_id)?.user?.name ?? null) : null
        }
        isEditing={editingId === c.id}
        editDraft={editDraft}
        onEditStart={(c2) => {
          setEditingId(c2.id);
          setEditDraft(c2.body);
        }}
        onEditChange={setEditDraft}
        onEditCancel={() => setEditingId(null)}
        onEditSave={(body) => editMutation.mutate({ id: c.id, body })}
        onDelete={() => deleteMutation.mutate(c.id)}
        onReply={() => {
          setReplyTo(c);
          document.querySelector<HTMLInputElement>('input[aria-label="Write a comment"]')?.focus();
        }}
      />
    );
    const replies = depth < MAX_THREAD_DEPTH ? (childrenOf.get(c.id) ?? []) : [];
    if (replies.length === 0) return item;
    return (
      <div key={c.id}>
        {item}
        <div className="mt-2.5 space-y-2.5 border-l-2 border-border pl-3 ml-1">
          {replies.map((r) => renderThread(r, depth + 1))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tops.map((c) => renderThread(c, 0))}

      <div aria-live="polite" className="h-4">
        <AnimatePresence>
          {remoteTyping && (
            <motion.p
              key={remoteTyping.userId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-text-secondary"
            >
              {remoteTyping.userName} is typing&hellip;
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {replyTo && (
        <div className="flex items-center justify-between rounded-md bg-surface-secondary px-2.5 py-1.5 text-xs text-text-secondary">
          Replying to {replyTo.user?.name ?? `#${replyTo.id}`}
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="cursor-pointer font-medium text-accent hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex gap-2"
      >
        {mention && mentionOptions.length > 0 && (
          <div
            role="listbox"
            aria-label="Mention a member"
            className="absolute bottom-full left-0 z-30 mb-1.5 max-h-52 w-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-popover"
          >
            {
              mentionOptions.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={i === mention.index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickMention(m);
                  }}
                  onMouseEnter={() => setMention({ ...mention, index: i })}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 ${
                    i === mention.index ? "bg-surface-secondary" : ""
                  }`}
                >
                  {m.everyone ? (
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                    >
                      <Users size={12} />
                    </span>
                  ) : (
                    <Avatar initials={initialsOf(m.label)} seed={m.label} src={m.avatar_url} alt={m.label} size="sm" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text-primary">{m.label}</span>
                    {m.hint && (
                      <span className="block truncate text-[11px] text-text-muted">{m.hint}</span>
                    )}
                  </span>
                </button>
              ))
            }
          </div>
        )}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            updateMention(e.target.value, e.target.selectionStart);
            if (e.target.value.trim()) broadcastTyping();
          }}
          onKeyDown={(e) => {
            if (!mention) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const dir = e.key === "ArrowDown" ? 1 : -1;
              const n = mentionOptions.length;
              if (n > 0) {
                setMention({ ...mention, index: (mention.index + dir + n) % n });
              }
            } else if (e.key === "Enter" || e.key === "Tab") {
              const pick = mentionOptions[mention.index];
              if (pick) {
                e.preventDefault();
                pickMention(pick);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              setMention(null);
            }
          }}
          onBlur={() => setMention(null)}
          placeholder="Add a comment... use @ to mention"
          aria-label="Write a comment"
          aria-expanded={mention !== null}
          aria-autocomplete="list"
          className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-[13px] text-text-primary transition-colors placeholder:text-text-muted hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={!draft.trim() || addMutation.isPending}
          className="h-9 shrink-0 cursor-pointer rounded-md bg-accent px-3 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function CommentItem({
  comment,
  meId,
  mentionNames,
  replyToName,
  isEditing,
  editDraft,
  onEditStart,
  onEditChange,
  onEditCancel,
  onEditSave,
  onDelete,
  onReply,
}: {
  comment: Comment;
  meId: number | null;
  mentionNames: string[];
  replyToName?: string | null;
  isEditing: boolean;
  editDraft: string;
  onEditStart: (comment: Comment) => void;
  onEditChange: (value: string) => void;
  onEditCancel: () => void;
  onEditSave: (body: string) => void;
  onDelete: () => void;
  onReply: () => void;
}) {
  const mine = meId != null && comment.user_id === meId;

  if (isEditing) {
    return (
      <div className="group" data-testid="comment-editing">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-text-primary">{comment.user?.name}</span>
          <time className="text-xs text-text-secondary">{clockTime(comment.created_at)}</time>
        </div>
        <textarea
          autoFocus
          value={editDraft}
          onChange={(e) => onEditChange(e.target.value)}
          rows={2}
          aria-label="Edit comment"
          className="mt-1 w-full resize-none rounded-md border border-accent bg-surface p-2 text-[13px] leading-relaxed text-text-primary outline-none ring-2 ring-accent/20"
        />
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const body = editDraft.trim();
              if (!body) return;
              onEditSave(body);
            }}
            className="cursor-pointer rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onEditCancel}
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2" data-testid="comment">
      <Avatar
        initials={initialsOf(comment.user?.name ?? "?")}
        seed={comment.user?.name}
        src={comment.user?.avatar_url}
        alt={comment.user?.name}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-medium text-text-primary">{comment.user?.name}</span>
        {mine && <span className="text-[10px] tracking-wide text-text-muted uppercase">you</span>}
        {replyToName && (
          <span className="text-[11px] text-text-muted">
            to <span className="font-medium text-text-secondary">{replyToName}</span>
          </span>
        )}
        <time className="text-xs text-text-secondary">{clockTime(comment.created_at)}</time>
      </div>
      <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap text-text-secondary">
        {renderMentionBody(comment.body, mentionNames)}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={onReply}
          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-secondary focus-visible:opacity-100"
        >
          <Reply size={11} /> Reply
        </button>
        {mine && (
          <>
            <button
              type="button"
              onClick={() => onEditStart(comment)}
              aria-label="Edit comment"
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-secondary focus-visible:opacity-100"
            >
              <Pencil size={11} /> Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete comment"
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            >
              <Trash2 size={11} /> Delete
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
  actorNames,
}: {
  activities: ActivityItem[];
  actorNames?: Record<number, string>;
}) {
  return (
    <ol aria-label="Activity timeline">
      {activities.map((a, i) => {
        const name = a.actor?.name ?? actorNames?.[a.actor_id] ?? "Someone";
        const last = i === activities.length - 1;
        return (
          <li key={a.id} className="relative flex gap-3 pb-4">
            {!last && <span className="absolute top-5 left-[7px] h-full w-px bg-border" aria-hidden="true" />}
            <span
              className="relative mt-1 h-[9px] w-[9px] shrink-0 rounded-full bg-accent ring-4 ring-surface"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-text-primary">
                <strong className="font-medium">{name}</strong>{" "}
                <span className="text-text-secondary">
                  {a.action} <span className="text-text-primary">{a.target}</span>
                </span>
              </p>
              <time className="text-xs text-text-secondary">{clockTime(a.created_at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
