const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "db", "fcid.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // watchlist: saved claims
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    state TEXT NOT NULL,
    year INTEGER,
    amount REAL,
    saved_at TEXT NOT NULL,
    source TEXT
    )
    `);

  // seed 1 record so the db has data
  db.run(
    `
    INSERT INTO watchlist (claim_id, state, year, amount, saved_at, source)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
    `,
    ["demo-claim-001", "FL", 2020, 12345.67, "seed"]
  );

  console.log("DB initialized:", dbPath);
});

db.close();