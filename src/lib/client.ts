import type { Role } from '@/lib/types';

export async function api<T>(url: string, role: Role, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'x-role': role },
    body: init?.body ? JSON.stringify(init.body) : undefined
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}
