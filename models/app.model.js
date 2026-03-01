const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "db", "fcid.db");
const db = new sqlite3.Database(dbPath);

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

module.exports = {
  getAllWatchlist,
  addWatchlist,
  deleteWatchlist
};