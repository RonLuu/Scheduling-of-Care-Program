import { Router } from 'express';
import { repo } from '../db/repo.js';
import { ensureAuth } from '../security/auth.js';
export const tasks = Router();
tasks.get('/my-tasks', async (req, res) => {
    const userId = Number(req.query.userId || 2);
    const days = Number(req.query.days || 30);
    const rows = await repo.getMyTasks(userId, days);
    res.json(rows);
});
tasks.post('/occurrences/:id/complete', async (req, res) => {
    await repo.completeOccurrence(Number(req.params.id), Number(req.body?.userId || 2), req.body?.comment);
    res.json({ ok: true });
});
// --- DEBUG: quick visibility into what's in SQLite
import Database from 'better-sqlite3';
const dbg = new Database('./care.db');
tasks.get('/_debug-counts', (_req, res) => {
    const q = (sql) => dbg.prepare(sql).get().n;
    res.json({
        users: q(`SELECT COUNT(*) n FROM user`),
        people: q(`SELECT COUNT(*) n FROM person`),
        items: q(`SELECT COUNT(*) n FROM care_item`),
        occs: q(`SELECT COUNT(*) n FROM occurrence`),
        dueSoon: q(`
      SELECT COUNT(*) n FROM occurrence
      WHERE status IN ('DUE','OVERDUE')
        AND date(COALESCE(override_due_date, due_date))
            BETWEEN date('now') AND date('now','+90 day')
    `),
    });
});
tasks.get('/_debug-occ', (_req, res) => {
    const rows = dbg.prepare(`
    SELECT id, care_item_id, due_date, status, assigned_to
    FROM occurrence
    ORDER BY due_date
    LIMIT 10
  `).all();
    res.json(rows);
});
tasks.get('/my-tasks', ensureAuth, async (req, res) => {
    const userId = req.user.id; // use logged-in user
    const days = Number(req.query.days || 30);
    const rows = await repo.getMyTasks(userId, days);
    res.json(rows);
});
tasks.post('/occurrences/:id/complete', ensureAuth, async (req, res) => {
    await repo.completeOccurrence(Number(req.params.id), req.user.id, req.body?.comment);
    res.json({ ok: true });
});
