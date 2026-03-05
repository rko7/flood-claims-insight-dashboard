const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "db", "fcid.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL,
      year INTEGER,
      amount REAL,
      saved_at TEXT NOT NULL,
      source TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      priority INTEGER,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_name TEXT NOT NULL,
      state TEXT,
      from_date TEXT,
      to_date TEXT,
      min_paid REAL,
      created_at TEXT NOT NULL
    )
  `);

  console.log("DB initialized:", dbPath);
});

db.close();