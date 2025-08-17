import { Pool } from 'pg';
import type { Repo, TaskRow } from '../repo.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const pgRepo: Repo = {
  async getMyTasks(userId, days) {
    const { rows } = await pool.query(
      `
      SELECT o.id AS occurrence_id,
             (COALESCE(o.override_due_date, o.due_date))::date AS due_on,
             o.status, ci.title, ci.category, p.full_name AS person
      FROM occurrence o
      JOIN care_item ci ON ci.id = o.care_item_id
      JOIN person p ON p.id = ci.person_id
      WHERE o.status IN ('DUE','OVERDUE')
        AND (o.assigned_to IS NULL OR o.assigned_to = $1)
        AND COALESCE(o.override_due_date, o.due_date)
            BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($2 || ' days')::interval)
      ORDER BY due_on ASC
      `,
      [userId, days]
    );
    return rows as TaskRow[];
  },

  async completeOccurrence(occId, userId, comment) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO completion_log (occurrence_id, completed_by, comment)
         VALUES ($1, $2, $3)`,
        [occId, userId, comment ?? null]
      );
      await client.query(
        `UPDATE occurrence SET status = 'COMPLETED' WHERE id = $1`,
        [occId]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // === Add these three ===

  async getUserByEmail(email: string): Promise<{
    id: number; name: string; email: string;
    role: 'ADMIN'|'STAFF'|'READONLY'; password_hash: string
  } | null> {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, password_hash
         FROM "user"
        WHERE email = $1
        LIMIT 1`,
      [email]
    );
    return (rows[0] as any) ?? null;
  },

  async getUserById(id: number): Promise<{
    id: number; name: string; email: string; role: 'ADMIN'|'STAFF'|'READONLY'; password_hash?: string
  } | null> {
    const { rows } = await pool.query(
      `SELECT id, name, email, role
         FROM "user"
        WHERE id = $1
        LIMIT 1`,
      [id]
    );
    return (rows[0] as any) ?? null;
  },

  async createUser(u: {
    name: string; email: string; role: 'ADMIN'|'STAFF'|'READONLY'; password_hash: string
  }): Promise<number> {
    const { rows } = await pool.query(
      `INSERT INTO "user" (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [u.name, u.email, u.role, u.password_hash]
    );
    return Number(rows[0].id);
  },
};