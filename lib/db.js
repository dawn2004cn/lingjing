import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'app.db')

let db

export function getDb() {
  if (!db) {
    const fs = require('fs')
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')

    // Users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Page visits (simple counter + daily aggregation friendly)
    db.exec(`
      CREATE TABLE IF NOT EXISTS page_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT,
        user_agent TEXT,
        visitedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Free fortune records — every submission logged
    // user_id links back to users; NULL allowed for future anonymous
    db.exec(`
      CREATE TABLE IF NOT EXISTS fortune_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        calendar_type TEXT NOT NULL DEFAULT '公历',
        birth_date TEXT NOT NULL,
        birth_hour TEXT NOT NULL,
        system TEXT NOT NULL DEFAULT 'bazi',
        birth_clock TEXT,
        is_leap_month INTEGER NOT NULL DEFAULT 0,
        use_true_solar INTEGER NOT NULL DEFAULT 0,
        province TEXT,
        city TEXT,
        day_sect INTEGER NOT NULL DEFAULT 2,
        boundary_hour INTEGER NOT NULL DEFAULT 0,
        boundary_jieqi INTEGER NOT NULL DEFAULT 0,
        cross_status TEXT NOT NULL DEFAULT 'skipped',
        true_solar_shift INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    // Migrate older DBs that lack newer columns
    try {
      const cols = db.prepare(`PRAGMA table_info(fortune_records)`).all()
      const names = new Set(cols.map((c) => c.name))
      const add = (name, ddl) => {
        if (!names.has(name)) db.exec(`ALTER TABLE fortune_records ADD COLUMN ${ddl}`)
      }
      add('system', `system TEXT NOT NULL DEFAULT 'bazi'`)
      add('birth_clock', `birth_clock TEXT`)
      add('is_leap_month', `is_leap_month INTEGER NOT NULL DEFAULT 0`)
      add('use_true_solar', `use_true_solar INTEGER NOT NULL DEFAULT 0`)
      add('province', `province TEXT`)
      add('city', `city TEXT`)
      add('day_sect', `day_sect INTEGER NOT NULL DEFAULT 2`)
      add('boundary_hour', `boundary_hour INTEGER NOT NULL DEFAULT 0`)
      add('boundary_jieqi', `boundary_jieqi INTEGER NOT NULL DEFAULT 0`)
      add('cross_status', `cross_status TEXT NOT NULL DEFAULT 'skipped'`)
      add('true_solar_shift', `true_solar_shift INTEGER NOT NULL DEFAULT 0`)
    } catch (_) {
      // ignore migration errors on fresh installs
    }

    // Seed admin if not exists
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
    if (!admin) {
      const bcrypt = require('bcryptjs')
      const hash = bcrypt.hashSync('admin123', 10)
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
    }
  }
  return db
}