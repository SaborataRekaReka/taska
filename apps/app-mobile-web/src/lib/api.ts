import { useAuthStore } from '../stores/auth';

const DEFAULT_LOCAL_API_URL = 'http://localhost:3000';

function normalizeApiBase(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    const isLocalDevHost = typeof window !== 'undefined'
      && ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (isLocalDevHost) {
      return DEFAULT_LOCAL_API_URL;
    }
    return '';
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

const BASE = normalizeApiBase(
  import.meta.env.VITE_API_URL
  ?? import.meta.env.EXPO_PUBLIC_API_URL,
);

function withBase(path: string): string {
  return BASE ? `${BASE}${path}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(withBase(path), { ...init, headers });

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      const retry = await fetch(withBase(path), { ...init, headers });
      return handleResponse<T>(retry);
    }
    useAuthStore.getState().logout();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    const err = body.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? 'Request failed');
  }
  const data = body.data;
  if (data && typeof data === 'object' && 'value' in data) {
    return data.value as T;
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(withBase('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    setTokens(body.data.accessToken, body.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export function getGoogleAuthStartUrl(): string {
  const callbackUrl = `${window.location.origin}/oauth/google/callback`;
  return `${withBase('/auth/google/start')}?returnTo=${encodeURIComponent(callbackUrl)}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
