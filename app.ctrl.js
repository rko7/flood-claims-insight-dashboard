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

// claim deno details
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

  // watchlist lookup
  const loadNotesAndRender = (claimDetails) => {
    model.getNotesByClaimId(id, (err, notes) => {
      res.render("claimDetails", {
        title: "Claim Details",
        message: "Details page loaded.",
        claim: claimDetails,
        notes: notes || [],
        hasNotesError: !!err
      });
    });
  };

  if (details) {
    return loadNotesAndRender(details);
  }

  // watchlist fallback
  model.getWatchlistByClaimId(id, (err, row) => {
    if (err) return res.status(500).send("DB error");
    if (!row) return res.status(404).send("Claim not found");

    const claimDetails = {
      claimId: row.claim_id,
      state: row.state || "",
      lossDate: "",
      year: row.year || "",
      paidAmount: row.amount != null ? Number(row.amount).toFixed(2) : "",
      source: row.source || "watchlist"
    };

    loadNotesAndRender(claimDetails);
  });
});

// notes list
app.get("/notes", (req, res) => {
  // list all notes
  model.getAllNotes((err, notes) => {
    res.render("notes", {
      title: "Notes",
      message: "Notes page loaded.",
      notes: notes || [],
      hasNotesError: !!err
    });
  });
});

// add note
app.post("/notes/add", (req, res) => {
  const claimId = (req.body.claim_id || "").trim();
  const noteText = (req.body.note_text || "").trim();
  const priority = req.body.priority ? parseInt(req.body.priority) : null;

  if (!claimId || !noteText) return res.status(400).send("Invalid note");

  model.addNote(
    { claim_id: claimId, note_text: noteText, priority: priority },
    (err) => {
      if (err) return res.status(500).send("DB error");
      res.redirect(`/claims/${claimId}`);
    }
  );
});

// delete note
app.post("/notes/delete", (req, res) => {
  // delete and return to details page
  const claimId = (req.body.claim_id || "").trim();
  const noteId = req.body.note_id ? parseInt(req.body.note_id) : null;

  if (!claimId || !noteId) return res.status(400).send("Invalid request");

  model.deleteNote(noteId, (err) => {
    if (err) return res.status(500).send("DB error");
    res.redirect(`/claims/${claimId}`);
  });
});

// edit note page
app.get("/notes/:id/edit", (req, res) => {
  // show edit form
  const noteId = req.params.id ? parseInt(req.params.id) : null;
  const claimId = (req.query.claim_id || "").trim();

  if (!noteId || !claimId) return res.status(400).send("Invalid request");

  model.getNoteById(noteId, (err, note) => {
    if (err) return res.status(500).send("DB error");
    if (!note) return res.status(404).send("Note not found");

    res.render("editNote", {
      title: "Edit Note",
      message: "Edit page loaded.",
      claimId: claimId,
      note: note
    });
  });
});

// update note
app.post("/notes/update", (req, res) => {
  // save changes
  const noteId = req.body.note_id ? parseInt(req.body.note_id) : null;
  const claimId = (req.body.claim_id || "").trim();
  const noteText = (req.body.note_text || "").trim();
  const priority = req.body.priority ? parseInt(req.body.priority) : null;

  if (!noteId || !claimId || !noteText) return res.status(400).send("Invalid note");

  model.updateNote(noteId, noteText, priority, (err) => {
    if (err) return res.status(500).send("DB error");
    res.redirect(`/claims/${claimId}`);
  });
});

// add to watchlist
app.post("/watchlist/add", (req, res) => {
  // validate inputs
  const claimId = (req.body.claim_id || "").trim();
  const state = (req.body.state || "").trim();
  const yearRaw = (req.body.year || "").trim();
  const amountRaw = (req.body.amount || "").trim();

  let year = null;
  let amount = null;

  if (!claimId) {
    return renderHomeWithError(res, "Claim ID is required.", {
      claim_id: claimId,
      state: state,
      year: yearRaw,
      amount: amountRaw
    });
  }

  if (!state) {
    return renderHomeWithError(res, "State is required.", {
      claim_id: claimId,
      state: state,
      year: yearRaw,
      amount: amountRaw
    });
  }

  if (yearRaw !== "") {
    year = parseInt(yearRaw);
    if (Number.isNaN(year) || year < 1900 || year > 2100) {
      return renderHomeWithError(res, "Invalid year.", {
        claim_id: claimId,
        state: state,
        year: yearRaw,
        amount: amountRaw
      });
    }
  }

  if (amountRaw !== "") {
    amount = parseFloat(amountRaw);
    if (Number.isNaN(amount) || amount < 0) {
      return renderHomeWithError(res, "Amount must be greater than or equal to 0.", {
        claim_id: claimId,
        state: state,
        year: yearRaw,
        amount: amountRaw
      });
    }
  }

  const item = {
    claim_id: claimId,
    state: state,
    year: year,
    amount: amount,
    source: req.body.source || "manual"
  };

  model.addWatchlist(item, (err) => {
    if (err) return res.status(500).send("DB error");
    res.redirect("/");
  });
});

// rerender home with error
function renderHomeWithError(res, errorMessage, formValues) {
  model.getAllWatchlist((err, rows) => {
    res.status(400).render("home", {
      title: "Flood Claims Insight Dashboard (FCID)",
      message: "Home page loaded.",
      error: errorMessage,
      watchlist: rows || [],
      hasError: !!err,
      form: formValues || {}
    });
  });
}

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