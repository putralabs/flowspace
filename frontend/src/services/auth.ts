import { api } from "./api";
import type { User, Workspace } from "@/types";

export interface AuthPayload {
  user: User;
  token: string;
}

export interface MePayload {
  user: User;
  workspaces: Pick<Workspace, "id" | "name">[];
}

export interface ProfileInput {
  name: string;
  email: string;
  job_title?: string | null;
}

export const authService = {
  register: (input: {
    name: string;
    email: string;
    password: string;
    invitation_token?: string | null;
  }) => api<AuthPayload>("/auth/register", { method: "POST", json: input }),

  login: (input: { email: string; password: string }) =>
    api<AuthPayload>("/auth/login", { method: "POST", json: input }),

  logout: () => api<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => api<MePayload>("/auth/me"),

  googleUrl: () => api<{ url: string }>("/auth/google"),

  updateProfile: (input: ProfileInput) =>
    api<{ user: User }>("/auth/profile", { method: "PUT", json: input }),

  updateProfilePicture: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return api<{ user: User }>("/auth/profile/picture", { method: "POST", body: form });
  },

  removeProfilePicture: () =>
    api<{ user: User }>("/auth/profile/picture", { method: "DELETE" }),

  updatePassword: (input: { current_password: string; password: string; password_confirmation: string }) =>
    api<{ message: string }>("/auth/password", { method: "PUT", json: input }),
};
