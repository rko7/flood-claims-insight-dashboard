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

// serve static files (css, images)
app.use(express.static("public"));

// parse form data
app.use(express.urlencoded({ extended: false }));

// home
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

// claims explorer
app.get("/claims", (req, res) => {
  // read filters
  const filters = {
    state: (req.query.state || "").trim(),
    from: (req.query.from || "").trim(),
    to: (req.query.to || "").trim(),
    minPaid: (req.query.minPaid || "").trim()
  };

  const hasFilters =
    filters.state !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.minPaid !== "";

  // demo results
  let results = [];
  if (hasFilters) {
    results = [
      {
        claimId: "demo-001",
        state: filters.state || "FL",
        lossDate: "2026-01-15",
        year: 2026,
        paidAmount: 1000.0
      },
      {
        claimId: "demo-002",
        state: filters.state || "FL",
        lossDate: "2026-02-01",
        year: 2026,
        paidAmount: 2500.0
      }
    ];

    // apply minPaid filter
    if (filters.minPaid !== "") {
      const min = parseFloat(filters.minPaid);
      if (!Number.isNaN(min)) {
        results = results.filter((r) => r.paidAmount >= min);
      }
    }
  }

  // format paidAmount for display
  results = results.map((r) => ({
    ...r,
    paidAmount: r.paidAmount.toFixed(2)
  }));

  res.render("claims", {
    title: "Claims Explorer",
    message: "Claims page loaded.",
    filters: filters,
    hasFilters: hasFilters,
    hasResults: results.length > 0,
    results: results
  });
});

// claim details
app.get("/claims/:id", (req, res) => {
  // demo only
  const id = req.params.id;

  let details = null;
  if (id === "demo-001") {
    details = {
      claimId: "demo-001",
      state: "FL",
      lossDate: "2026-01-15",
      year: 2026,
      paidAmount: "1000.00",
      source: "demo"
    };
  } else if (id === "demo-002") {
    details = {
      claimId: "demo-002",
      state: "FL",
      lossDate: "2026-02-01",
      year: 2026,
      paidAmount: "2500.00",
      source: "demo"
    };
  }

  if (!details) {
    return res.status(404).send("Claim not found");
  }

  res.render("claimDetails", {
    title: "Claim Details",
    message: "Details page loaded.",
    claim: details
  });
});

// add to watchlist
app.post("/watchlist/add", (req, res) => {
  const item = {
    claim_id: req.body.claim_id,
    state: req.body.state,
    year: req.body.year ? parseInt(req.body.year) : null,
    amount: req.body.amount ? parseFloat(req.body.amount) : null,
    source: req.body.source || "manual"
  };

  model.addWatchlist(item, (err) => {
    if (err) return res.status(500).send("DB error");
    res.redirect("/");
  });
});

// delete from watchlist
app.post("/watchlist/delete", (req, res) => {
  const id = req.body.id ? parseInt(req.body.id) : null;
  if (!id) return res.status(400).send("Invalid id");

  model.deleteWatchlist(id, (err) => {
    if (err) return res.status(500).send("DB error");
    res.redirect("/");
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});