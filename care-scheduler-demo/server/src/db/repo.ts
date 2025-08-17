export type TaskRow = {
  occurrence_id: number;
  due_on: string;
  status: 'DUE'|'OVERDUE'|'COMPLETED'|'SKIPPED';
  title: string;
  category: string | null;
  person: string;
};


export type Role = 'ADMIN' | 'STAFF' | 'READONLY';

export type DbUserWithHash = {
  id: number;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
};

export type DbUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};


export interface Repo {
  getMyTasks(userId: number, days: number): Promise<TaskRow[]>;

  completeOccurrence(occId: number, userId: number, comment?: string): Promise<void>;

  getUserByEmail(email: string): Promise<DbUserWithHash | null>;
  getUserById(id: number): Promise<DbUser | null>;
  createUser(u: { name: string; email: string; role: Role; password_hash: string }): Promise<number>;

}

const usePostgres = !!process.env.DATABASE_URL?.startsWith('postgres://');

export let repo: Repo;
if (usePostgres) {
  const { pgRepo } = await import('./drivers/postgres.js');
  repo = pgRepo;
} else {
  const { sqliteRepo } = await import('./drivers/sqlite.js');
  repo = sqliteRepo;
}
