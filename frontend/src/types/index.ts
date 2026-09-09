export type Presence = "online" | "away" | "offline";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "archived";
export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface User {
  id: number;
  name: string;
  email: string;
  job_title?: string | null;
  avatar_url?: string | null;
}

export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  projects_count?: number;
  members_count?: number;
  my_role?: WorkspaceRole;
}

export interface WorkspaceMember extends User {
  role: WorkspaceRole;
}

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  tasks_count?: number;
  my_role?: WorkspaceRole;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface CommentReactionCount {
  emoji: string;
  count: number;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: string;
  user?: Pick<User, "id" | "name" | "avatar_url">;
  reactions?: CommentReactionCount[];
  mine?: boolean;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee_id: number | null;
  creator_id: number;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  labels?: Label[];
  assignee?: Pick<User, "id" | "name" | "email" | "avatar_url"> | null;
  creator?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface ActivityItem {
  id: number;
  workspace_id: number;
  actor_id: number;
  action: string;
  target: string | null;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string;
  actor?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface AppNotification {
  id: number;
  workspace_id?: number | null;
  type: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface Attachment {
  id: number;
  task_id: number;
  user_id: number;
  filename: string;
  path: string;
  mime: string | null;
  size: number;
  created_at: string;
  user?: Pick<User, "id" | "name"> | null;
}

export interface InvitationPreview {
  email: string;
  role: WorkspaceRole;
  workspace: Pick<Workspace, "id" | "name">;
}

export interface PendingInvitation {
  id: number;
  workspace_id: number;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: number;
  created_at: string;
  workspace?: Pick<Workspace, "id" | "name"> | null;
  inviter?: Pick<User, "id" | "name" | "avatar_url"> | null;
  invitee?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface SearchResult {
  projects: { id: number; workspace_id: number; name: string; slug: string; color: string }[];
  tasks: { id: number; project_id: number; project_slug?: string | null; title: string; status: TaskStatus; priority: Priority; project?: { id: number; slug?: string; name: string } }[];
  members: User[];
  comments: { id: number; body: string; task_title: string }[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
