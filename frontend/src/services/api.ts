export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem("flowspace-token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("flowspace-token", token);
  else localStorage.removeItem("flowspace-token");
}

function humanize(status: number, message?: string): string {
  switch (status) {
    case 0:
      return "Tidak dapat terhubung ke server. Periksa koneksi internetmu.";
    case 401:
      return "Sesi kamu berakhir. Silakan login kembali.";
    case 403:
      return message || "Kamu tidak punya akses untuk aksi ini.";
    case 404:
      return "Data tidak ditemukan. Mungkin sudah dihapus.";
    case 422:
      return message || "Data yang dikirim tidak valid.";
    case 429:
      return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    default:
      if (status >= 500) return "Terjadi kesalahan di server. Coba lagi beberapa saat.";
      return message || "Terjadi kesalahan. Coba lagi.";
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;

  const init: RequestInit = {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, humanize(0));
  }

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent("flowspace:unauthorized"));
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const serverMessage = typeof data?.message === "string" ? data.message : undefined;
    throw new ApiError(res.status, humanize(res.status, serverMessage), data?.errors ?? {});
  }

  return data as T;
}

export function firstErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldError = Object.values(err.errors)[0]?.[0];
    return fieldError ? `${err.message} ${fieldError}` : err.message;
  }
  return "Terjadi kesalahan tak terduga. Coba lagi.";
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
