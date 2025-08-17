const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

async function parseJsonSafe(r: Response) {
  const text = await r.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export async function me() {
  const r = await fetch(`${base}/auth/me`, { credentials: 'include' });
  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error('me failed');
  return data;
}

export async function login(email: string, password: string) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error((data as any).error || `Login failed (${r.status})`);
  return data;
}

export async function signup(name: string, email: string, password: string, role: 'ADMIN'|'STAFF'|'READONLY') {
  const r = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error((data as any).error || `Signup failed (${r.status})`);
  return data;
}

export async function logout() {
  const r = await fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' });
  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error('Logout failed');
  return data;
}