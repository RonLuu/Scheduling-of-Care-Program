const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export async function getMyTasks(days = 30) {
  const res = await fetch(`${base}/api/my-tasks?days=${days}`);
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

export async function completeOccurrence(id: number, comment?: string) {
  const res = await fetch(`${base}/api/occurrences/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify({ comment })
  });
  if (!res.ok) throw new Error('Failed to complete');
  return res.json();
}
