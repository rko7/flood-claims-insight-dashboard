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

function priorityLabel(p) {
  if (p === 1) return "1: Most important";
  if (p === 2) return "2: High";
  if (p === 3) return "3: Medium";
  if (p === 4) return "4: Low";
  if (p === 5) return "5: Lowest";
  return "-";
}

// note form state
function buildNoteForm(priorityRaw, noteText) {
  const p = (priorityRaw || "").trim();

  return {
    note_text: noteText || "",
    selected1: p === "1" ? "selected" : "",
    selected2: p === "2" ? "selected" : "",
    selected3: p === "3" ? "selected" : "",
    selected4: p === "4" ? "selected" : "",
    selected5: p === "5" ? "selected" : ""
  };
}

// home
app.get("/", (req, res) => {
  model.getAllWatchlist((err, rows) => {
    res.render("home", {
      title: "Flood Claims Insight Dashboard (FCID)",
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
  const loadNotesAndRender = (claimDetails, toastError, noteForm) => {
    model.getNotesByClaimId(id, (err, notes) => {
      const rows = (notes || []).map((n) => ({
        ...n,
        priorityLabel: priorityLabel(n.priority)
      }));

      if (rows.length > 0) {
        rows[0].firstNote = true;
        rows[rows.length - 1].lastNote = true;
      }

      res.render("claimDetails", {
        title: "Claim Details",
        claim: claimDetails,
        notes: rows,
        hasNotesError: !!err,
        toastError: toastError || "",
        noteForm: noteForm || buildNoteForm("", "")
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
    const rows = (notes || []).map((n) => ({
      ...n,
      priorityLabel: priorityLabel(n.priority),
      wl_amount:
        n.wl_amount != null && n.wl_amount !== ""
          ? Number(n.wl_amount).toFixed(2)
          : ""
    }));

    // table open/close flags
    if (rows.length > 0) {
      rows[0].firstRow = true;
      rows[rows.length - 1].lastRow = true;
    }

    res.render("notes", {
      title: "Notes",
      notes: rows,
      toastError: err ? "Error loading notes." : ""
    });
  });
});

// add note
app.post("/notes/add", (req, res) => {
  const claimId = (req.body.claim_id || "").trim();
  const noteText = (req.body.note_text || "").trim();
  const priorityRaw = (req.body.priority || "").trim();

  if (!claimId) return res.status(400).send("Invalid request");

  // note 5 to 300 char
  if (noteText.length < 5 || noteText.length > 300) {
    return renderDetailsWithToast(res, claimId, "Note must be 5 to 300 characters.", buildNoteForm(priorityRaw, noteText));
  }
  // priority 1 to 5
  let priority = null;
  if (priorityRaw !== "") {
    priority = parseInt(priorityRaw);
    if (Number.isNaN(priority) || priority < 1 || priority > 5) {
      return renderDetailsWithToast(res, claimId, "Priority must be from 1 to 5.", buildNoteForm(priorityRaw, noteText));
    }
  }

  model.addNote(
    { claim_id: claimId, note_text: noteText, priority: priority },
    (err) => {
      if (err) return res.status(500).send("DB error");
      res.redirect(`/claims/${claimId}`);
    }
  );
});

function renderDetailsWithToast(res, claimId, toastMessage, noteForm) {
  const renderWithDetails = (claimDetails) => {
    model.getNotesByClaimId(claimId, (err, notes) => {
      const rows = (notes || []).map((n) => ({
        ...n,
        priorityLabel: priorityLabel(n.priority)
      }));

      if (rows.length > 0) {
        rows[0].firstNote = true;
        rows[rows.length - 1].lastNote = true;
      }

      res.status(400).render("claimDetails", {
        title: "Claim Details",
        claim: claimDetails,
        notes: rows,
        hasNotesError: !!err,
        toastError: toastMessage,
        noteForm: noteForm || buildNoteForm("", "")
      });
    });
  };

  if (claimId === "demo-001") {
    return renderWithDetails({
      claimId: "demo-001",
      state: "FL",
      lossDate: "2026-01-15",
      year: 2026,
      paidAmount: "1000.00",
      source: "demo"
    });
  }

  if (claimId === "demo-002") {
    return renderWithDetails({
      claimId: "demo-002",
      state: "FL",
      lossDate: "2026-02-01",
      year: 2026,
      paidAmount: "2500.00",
      source: "demo"
    });
  }

  model.getWatchlistByClaimId(claimId, (err, row) => {
    if (err) return res.status(500).send("DB error");
    if (!row) return res.status(404).send("Claim not found");

    renderWithDetails({
      claimId: row.claim_id,
      state: row.state || "",
      lossDate: "",
      year: row.year || "",
      paidAmount: row.amount != null ? Number(row.amount).toFixed(2) : "",
      source: row.source || "watchlist"
    });
  });
}

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

    const p = note.priority != null ? String(note.priority) : "";
    res.render("editNote", {
      title: "Edit Note",
      claimId: claimId,
      note: note,
      toastError: "",
      isP1: p === "1",
      isP2: p === "2",
      isP3: p === "3",
      isP4: p === "4",
      isP5: p === "5"
    });
  });
});

// update note
app.post("/notes/update", (req, res) => {
  // save changes
  const noteId = req.body.note_id ? parseInt(req.body.note_id) : null;
  const claimId = (req.body.claim_id || "").trim();
  const noteText = (req.body.note_text || "").trim();
  const priorityRaw = (req.body.priority || "").trim();

  if (!noteId || !claimId) return res.status(400).send("Invalid request");

  // note length 5..300
  if (noteText.length < 5 || noteText.length > 300) {
    return renderEditWithToast(res, noteId, claimId, "Note must be 5 to 300 characters.", {
      note_text: noteText,
      priorityRaw: priorityRaw
    });
  }

  // priority 1..5 (optional)
  let priority = null;
  if (priorityRaw !== "") {
    priority = parseInt(priorityRaw);
    if (Number.isNaN(priority) || priority < 1 || priority > 5) {
      return renderEditWithToast(res, noteId, claimId, "Priority must be from 1 to 5.", {
        note_text: noteText,
        priorityRaw: priorityRaw
      });
    }
  }

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
      return renderHomeWithError(res, "Invalid Year.", {
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
      error: errorMessage,
      watchlist: rows || [],
      hasError: !!err,
      form: formValues || {}
    });
  });
}

// rerender edit page with toast
function renderEditWithToast(res, noteId, claimId, toastMessage, form) {
  model.getNoteById(noteId, (err, note) => {
    if (err) return res.status(500).send("DB error");
    if (!note) return res.status(404).send("Note not found");

    // override values with user input
    const noteText = form && form.note_text != null ? form.note_text : note.note_text;
    const p = form && form.priorityRaw != null ? String(form.priorityRaw) : (note.priority != null ? String(note.priority) : "");

    res.status(400).render("editNote", {
      title: "Edit Note",
      claimId: claimId,
      toastError: toastMessage,
      note: {
        id: note.id,
        note_text: noteText,
        priority: p
      },
      isP1: p === "1",
      isP2: p === "2",
      isP3: p === "3",
      isP4: p === "4",
      isP5: p === "5"
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