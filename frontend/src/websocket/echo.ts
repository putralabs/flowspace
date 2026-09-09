import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getToken } from "@/services/api";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

let echo: Echo<"pusher"> | null = null;

/** Minimal shape we rely on; avoids depending on pusher-js internals. */
export interface EchoChannel {
  listen(event: string, callback: (payload: never) => void): EchoChannel;
}

export interface PresenceEchoChannel extends EchoChannel {
  here(callback: (users: { id: number; name: string }[]) => void): PresenceEchoChannel;
  joining(callback: (user: { id: number; name: string }) => void): PresenceEchoChannel;
  leaving(callback: (user: { id: number; name: string }) => void): PresenceEchoChannel;
}

export function getEcho(): Echo<"pusher"> {
  if (echo) return echo;

  const key = import.meta.env.VITE_REVERB_APP_KEY ?? "flowspace";
  const host = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname;
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
  const cluster = import.meta.env.VITE_REVERB_CLUSTER ?? "mt1";

  // pusher-js is resolved via the default export interop of the CJS bundle.
  const PusherClient = (Pusher as unknown as { default?: typeof Pusher }).default ?? Pusher;

  echo = new Echo({
    broadcaster: "pusher",
    key,
    cluster,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: getToken() ? `Bearer ${getToken()}` : "",
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Pusher: PusherClient as any,
  });

  return echo;
}

/** Tear down all subscriptions (called on login/logout). */
export function resetEcho() {
  if (!echo) return;
  echo.disconnect();
  echo = null;
}

export function projectChannel(projectId: number): EchoChannel {
  return getEcho().private(`project.${projectId}`) as unknown as EchoChannel;
}

export function userChannel(userId: number): EchoChannel {
  return getEcho().private(`user.${userId}`) as unknown as EchoChannel;
}

export function workspacePresenceChannel(workspaceId: number): PresenceEchoChannel {
  return getEcho().join(`workspace.${workspaceId}.presence`) as unknown as PresenceEchoChannel;
}
