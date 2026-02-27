const express = require("express");
const mustacheExpress = require("mustache-express");
const path = require("path");
const model = require("./models/app.model");

const app = express();
const PORT = process.env.PORT || 3000;

// Mustache setup
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));

// Serve static files (css, images)
app.use(express.static("public"));

// Parse form data
app.use(express.urlencoded({ extended: false }));

// Home
app.get("/", (req, res) => {
  model.getAllWatchlist((err, rows) => {
    res.render("home", {
      title: "Flood Claims Insight Dashboard (FCID)",
      message: "Home page loaded.",
      watchlist: rows || [],
      hasError: !!err
    });
  });
});

// Add to watchlist
app.post("/watchlist/add", (req, res) => {
  const item = {
    claim_id: req.body.claim_id,
    state: req.body.state,
    year: req.body.year ? parseInt(req.body.year) : null,
    amount: req.body.amount ? parseFloat(req.body.amount) : null,
    source: req.body.source || "manual"
  };

  model.addWatchlist(item, (err) => {
    if (err) {
      return res.status(500).send("DB error");
    }
    res.redirect("/");
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});