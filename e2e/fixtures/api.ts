import { request, APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:3000';

export async function apiCtx(): Promise<APIRequestContext> {
  return await request.newContext({ baseURL: API_BASE });
}

export async function loginViaApi(username: string, password: string) {
  const ctx = await apiCtx();
  const res = await ctx.post('/api/auth/login', { data: { username, password } });
  if (!res.ok()) throw new Error(`Login failed for ${username}: ${res.status()}`);
  const body = await res.json();
  await ctx.dispose();
  return body as { token: string; user: { id: number; role: string; shop_id: number; barber_id?: number } };
}

export async function getJSON(token: string, path: string) {
  const ctx = await apiCtx();
  const res = await ctx.get(path, { headers: { Authorization: `Bearer ${token}` } });
  const body = res.ok() ? await res.json() : null;
  await ctx.dispose();
  return { status: res.status(), body };
}

export async function postJSON(token: string, path: string, data: unknown) {
  const ctx = await apiCtx();
  const res = await ctx.post(path, { headers: { Authorization: `Bearer ${token}` }, data });
  const body = res.ok() ? await res.json().catch(() => null) : null;
  const errorBody = !res.ok() ? await res.text().catch(() => '') : '';
  await ctx.dispose();
  return { status: res.status(), body, errorBody };
}
