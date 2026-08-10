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
        plan TEXT NOT NULL DEFAULT 'free',
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

    try {
      const userCols = db.prepare(`PRAGMA table_info(users)`).all()
      const userNames = new Set(userCols.map((c) => c.name))
      if (!userNames.has('plan')) {
        db.exec(`ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'`)
      }
    } catch (_) {
      // ignore
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS llm_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'polish',
        system TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_llm_usage_user_day ON llm_usage(user_id, day)
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS redeem_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        plan TEXT NOT NULL DEFAULT 'pro',
        max_uses INTEGER NOT NULL DEFAULT 1,
        used_count INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        expires_at TEXT,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        disabled INTEGER NOT NULL DEFAULT 0
      )
    `)
    db.exec(`
      CREATE TABLE IF NOT EXISTS redeem_redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        plan TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(code_id, user_id),
        FOREIGN KEY (code_id) REFERENCES redeem_codes(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS plan_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        plan TEXT NOT NULL DEFAULT 'pro',
        amount_fen INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        provider TEXT NOT NULL DEFAULT 'mock',
        paid_at TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_plan_orders_user ON plan_orders(user_id, created_at)
    `)

    // Seed admin if not exists
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
    if (!admin) {
      const bcrypt = require('bcryptjs')
      const hash = bcrypt.hashSync('admin123', 10)
      db.prepare('INSERT INTO users (username, password, role, plan) VALUES (?, ?, ?, ?)').run(
        'admin',
        hash,
        'admin',
        'free',
      )
    }
  }
  return db
}