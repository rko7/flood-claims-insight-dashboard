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

module.exports = {
  getAllWatchlist
};