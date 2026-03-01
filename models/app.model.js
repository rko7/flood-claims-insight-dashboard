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

function getAllWatchlist(cb) {
  const sql = "SELECT * FROM watchlist ORDER BY id DESC";
  db.all(sql, [], (err, rows) => {
    cb(err, rows);
  });
}

// add a watchlist record
function addWatchlist(item, cb) {
  const sql = `
    INSERT INTO watchlist (claim_id, state, year, amount, saved_at, source)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
  `;
  db.run(
    sql,
    [item.claim_id, item.state, item.year, item.amount, item.source],
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

module.exports = {
  getAllWatchlist,
  addWatchlist,
  deleteWatchlist,
  getNotesByClaimId,
  addNote,
  deleteNote
};