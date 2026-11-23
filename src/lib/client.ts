import type { Role } from '@/lib/types';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

export async function api<T>(url: string, role: Role, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'x-role': role },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  const payload = (await res.json()) as ApiEnvelope<T> & T;

  if (!res.ok || payload.success === false) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return (payload.data !== undefined ? payload.data : payload) as T;
}
