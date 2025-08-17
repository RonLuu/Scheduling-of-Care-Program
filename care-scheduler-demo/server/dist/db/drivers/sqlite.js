import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
const db = new Database('./care.db');
db.pragma('foreign_keys = ON');
// Schema + seed (idempotent, for dev convenience)
db.exec(`
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','STAFF','READONLY')),
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS person (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  dob DATE,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS care_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  instructions TEXT,
  freq_unit TEXT NOT NULL CHECK(freq_unit IN ('DAY','WEEK','MONTH','YEAR')),
  interval INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  is_procurement INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS occurrence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  care_item_id INTEGER NOT NULL REFERENCES care_item(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DUE','OVERDUE','COMPLETED','SKIPPED')) DEFAULT 'DUE',
  assigned_to INTEGER REFERENCES user(id),
  override_due_date DATE
);
CREATE TABLE IF NOT EXISTS completion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurrence_id INTEGER NOT NULL REFERENCES occurrence(id) ON DELETE CASCADE,
  completed_by INTEGER NOT NULL REFERENCES user(id),
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comment TEXT
);
CREATE TABLE IF NOT EXISTS attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurrence_id INTEGER NOT NULL REFERENCES occurrence(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT,
  uploaded_by INTEGER REFERENCES user(id),
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cost_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  care_item_id INTEGER REFERENCES care_item(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  cost_date DATE NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_occ_due ON occurrence(due_date, status);
CREATE INDEX IF NOT EXISTS idx_occ_item ON occurrence(care_item_id);
CREATE INDEX IF NOT EXISTS idx_cost_person_date ON cost_ledger(person_id, cost_date);
`);
let hasPerson = false;
try {
    const countRow = db.prepare('SELECT COUNT(*) as n FROM person').get();
    hasPerson = (countRow?.n ?? 0) > 0;
}
catch {
    // Table doesn't exist yet, definitely no people
    hasPerson = false;
}
if (!hasPerson) {
    const pw = bcrypt.hashSync('123456789', 10);
    const u = db.prepare('INSERT INTO user (name,email,role,password_hash) VALUES (?,?,?,?)');
    const staff = Number(u.run('Alex Staff', 'alex@gmail.com', 'STAFF', pw).lastInsertRowid);
    u.run('Chris Admin', 'chris@gmail.com', 'ADMIN', pw);
    const personId = Number(db.prepare('INSERT INTO person (full_name) VALUES (?)').run('Alex Wong').lastInsertRowid);
    const insertItem = db.prepare(`
    INSERT INTO care_item (person_id,title,category,instructions,freq_unit,interval,start_date,active,is_procurement)
    VALUES (?,?,?,?,?,?,DATE('now'),1,?)
  `);
    const toothbrush = Number(insertItem.run(personId, 'Replace toothbrush head', 'Hygiene', 'Use model XYZ head', 'MONTH', 3, 1).lastInsertRowid);
    const cradle = Number(insertItem.run(personId, 'Clean toothbrush cradle', 'Hygiene', 'Mild detergent', 'MONTH', 1, 0).lastInsertRowid);
    const dentist = Number(insertItem.run(personId, 'Dentist checkup', 'Health', 'Routine check', 'MONTH', 6, 0).lastInsertRowid);
    const addOcc = db.prepare('INSERT INTO occurrence (care_item_id,due_date,status,assigned_to) VALUES (?,?,?,?)');
    // Accept number | bigint to be safe, cast once when writing
    function addOccurrences(id, unit, interval, monthsSpan = 6) {
        const end = new Date();
        end.setMonth(end.getMonth() + monthsSpan);
        let cursor = new Date();
        while (cursor <= end) {
            addOcc.run(Number(id), cursor.toISOString().slice(0, 10), 'DUE', staff);
            if (unit === 'DAY')
                cursor.setDate(cursor.getDate() + interval);
            else if (unit === 'WEEK')
                cursor.setDate(cursor.getDate() + 7 * interval);
            else if (unit === 'MONTH')
                cursor.setMonth(cursor.getMonth() + interval);
            else
                cursor.setFullYear(cursor.getFullYear() + interval);
        }
    }
    addOccurrences(toothbrush, 'MONTH', 3);
    addOccurrences(cradle, 'MONTH', 1);
    addOccurrences(dentist, 'MONTH', 6);
}
function markOverdue() {
    db.prepare(`UPDATE occurrence SET status='OVERDUE'
              WHERE status='DUE' AND date(COALESCE(override_due_date, due_date)) < date('now')`).run();
}
markOverdue();
export const sqliteRepo = {
    async getMyTasks(_userId, days) {
        const stmt = db.prepare(`
    SELECT o.id AS occurrence_id,
           COALESCE(o.override_due_date, o.due_date) AS due_on,
           o.status, ci.title, ci.category, p.full_name AS person
    FROM occurrence o
    JOIN care_item ci ON ci.id = o.care_item_id
    JOIN person p ON p.id = ci.person_id
    WHERE o.status IN ('DUE','OVERDUE')
      AND date(COALESCE(o.override_due_date, o.due_date)) >= date('now')
      AND date(COALESCE(o.override_due_date, o.due_date)) <= date('now', printf('+%d day', ?))
    ORDER BY due_on ASC
  `);
        return stmt.all(days);
    },
    async completeOccurrence(occId, userId, comment) {
        const insert = db.prepare('INSERT INTO completion_log (occurrence_id, completed_by, comment) VALUES (?,?,?)');
        const update = db.prepare('UPDATE occurrence SET status=? WHERE id=?');
        const txn = db.transaction(() => { insert.run(occId, userId, comment ?? null); update.run('COMPLETED', occId); });
        txn();
    },
    // FULL user incl. password_hash (used only during login)
    async getUserByEmail(email) {
        const r = db.prepare(`SELECT id, name, email, role, password_hash FROM user WHERE email = ?`).get(email);
        if (!r)
            return null;
        return {
            id: Number(r.id),
            name: String(r.name),
            email: String(r.email),
            role: r.role,
            password_hash: String(r.password_hash),
        };
    },
    // SAFE user without hash (used for session deserialize and /auth/me)
    async getUserById(id) {
        const r = db.prepare(`SELECT id, name, email, role FROM user WHERE id = ?`).get(id);
        if (!r)
            return null;
        return {
            id: Number(r.id),
            name: String(r.name),
            email: String(r.email),
            role: r.role,
        };
    },
    // create user returns numeric id
    async createUser(u) {
        const stmt = db.prepare(`INSERT INTO user (name, email, role, password_hash) VALUES (?, ?, ?, ?)`);
        return Number(stmt.run(u.name, u.email, u.role, u.password_hash).lastInsertRowid);
    }
};
