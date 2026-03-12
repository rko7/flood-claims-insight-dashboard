const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "db", "fcid.db");
const db = new sqlite3.Database(dbPath);

// notes table
db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    note_text TEXT NOT NULL,
    priority INTEGER,
    created_at TEXT NOT NULL
  )
`);

// watchlist table
db.run(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    year INTEGER,
    amount REAL,
    flood_zone TEXT,
    cause_code TEXT,
    saved_at TEXT NOT NULL,
    source TEXT
  )
`);

// saved_reports table
db.run(`
  CREATE TABLE IF NOT EXISTS saved_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_name TEXT NOT NULL,
    state TEXT,
    from_date TEXT,
    to_date TEXT,
    min_paid REAL,
    max_paid REAL,
    flood_zone TEXT,
    cause TEXT,
    created_at TEXT NOT NULL
  )
`);

// lightweight migration for older db files (ignore if already exists)
db.run(`ALTER TABLE watchlist ADD COLUMN flood_zone TEXT`, () => {});
db.run(`ALTER TABLE watchlist ADD COLUMN cause_code TEXT`, () => {});
db.run(`ALTER TABLE saved_reports ADD COLUMN max_paid REAL`, () => {});
db.run(`ALTER TABLE saved_reports ADD COLUMN flood_zone TEXT`, () => {});
db.run(`ALTER TABLE saved_reports ADD COLUMN cause TEXT`, () => {});

// watchlist
function getAllWatchlist(cb) {
  const sql = "SELECT * FROM watchlist ORDER BY id DESC";
  db.all(sql, [], (err, rows) => {
    cb(err, rows);
  });
}

// get a watchlist record by claim_id
function getWatchlistByClaimId(claimId, cb) {
  const sql = "SELECT * FROM watchlist WHERE claim_id = ? ORDER BY id DESC LIMIT 1";
  db.get(sql, [claimId], (err, row) => {
    cb(err, row);
  });
}

// add a watchlist record
function addWatchlist(item, cb) {
  const sql = `
    INSERT INTO watchlist (claim_id, state, year, amount, flood_zone, cause_code, saved_at, source)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `;
  db.run(
    sql,
    [
      item.claim_id,
      item.state,
      item.year,
      item.amount,
      item.flood_zone || null,
      item.cause_code || null,
      item.source
    ],
    (err) => cb(err)
  );
}

// delete a watchlist record
function deleteWatchlist(id, cb) {
  const sql = "DELETE FROM watchlist WHERE id = ?";
  db.run(sql, [id], (err) => cb(err));
}

// get notes for a claim
function getNotesByClaimId(claimId, cb) {
  const sql = "SELECT * FROM notes WHERE claim_id = ? ORDER BY id DESC";
  db.all(sql, [claimId], (err, rows) => {
    cb(err, rows);
  });
}

// add a note
function addNote(note, cb) {
  const sql = `
    INSERT INTO notes (claim_id, note_text, priority, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `;
  db.run(sql, [note.claim_id, note.note_text, note.priority], (err) => cb(err));
}

// delete a note
function deleteNote(noteId, cb) {
  const sql = "DELETE FROM notes WHERE id = ?";
  db.run(sql, [noteId], (err) => cb(err));
}

// get a note by id
function getNoteById(noteId, cb) {
  const sql = "SELECT * FROM notes WHERE id = ?";
  db.get(sql, [noteId], (err, row) => {
    cb(err, row);
  });
}

// update a note
function updateNote(noteId, noteText, priority, cb) {
  const sql = "UPDATE notes SET note_text = ?, priority = ? WHERE id = ?";
  db.run(sql, [noteText, priority, noteId], (err) => cb(err));
}

// get all notes with watchlist info
function getAllNotes(cb) {
  const sql = `
    SELECT
      n.id,
      n.claim_id,
      n.note_text,
      n.priority,
      n.created_at,
      w.state AS wl_state,
      w.year AS wl_year,
      w.amount AS wl_amount,
      w.flood_zone AS wl_flood_zone,
      w.cause_code AS wl_cause_code
    FROM notes n
    LEFT JOIN watchlist w ON w.claim_id = n.claim_id
    ORDER BY n.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    cb(err, rows);
  });
}

//get all saved reports
function getAllReports(cb) {
  const sql = "SELECT * FROM saved_reports ORDER BY id DESC";
  db.all(sql, [], (err, rows) => cb(err, rows));
}

// add a saved report
function addReport(report, cb) {
  const sql = `
    INSERT INTO saved_reports (report_name, state, from_date, to_date, min_paid, max_paid, flood_zone, cause, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  db.run(
    sql,
    [
      report.report_name,
      report.state,
      report.from_date,
      report.to_date,
      report.min_paid,
      report.max_paid,
      report.flood_zone,
      report.cause || null
    ],
    (err) => cb(err)
  );
}

// get a saved report
function getReportById(id, cb) {
  const sql = "SELECT * FROM saved_reports WHERE id = ?";
  db.get(sql, [id], (err, row) => cb(err, row));
}

// delete a saved report
function deleteReport(id, cb) {
  const sql = "DELETE FROM saved_reports WHERE id = ?";
  db.run(sql, [id], (err) => cb(err));
}

module.exports = {
  getAllWatchlist,
  getWatchlistByClaimId,
  addWatchlist,
  deleteWatchlist,
  getNotesByClaimId,
  addNote,
  deleteNote,
  getNoteById,
  updateNote,
  getAllNotes,
  getAllReports,
  addReport,
  getReportById,
  deleteReport
};