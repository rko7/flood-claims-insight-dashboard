const express = require("express");
const mustacheExpress = require("mustache-express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Mustache setup
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));


// Route renders a view
app.get("/", (req, res) => {
  res.render("home", {
    title: "FloodDash",
    message: "Home page loaded."
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});