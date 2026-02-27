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

// Route renders a view
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});