const express = require("express");
const mustacheExpress = require("mustache-express");
const path = require("path");
const https = require("https"); // API calls
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
// state validation
function isValidState2(stateRaw) {
  const s = (stateRaw || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s);
}
// date validation
function parseYmd(s) {
  const v = (s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const [yy, mm, dd] = v.split("-").map((x) => parseInt(x, 10));
  if (d.getUTCFullYear() !== yy || d.getUTCMonth() + 1 !== mm || d.getUTCDate() !== dd) return null;
  return v;
}
// claim ID validation
function isLikelyValidClaimId(claimIdRaw) {
  const id = (claimIdRaw || "").trim();
  if (/^demo-\d{3}$/i.test(id)) return true;
  return /^[A-Za-z0-9-]{6,80}$/.test(id);
}



// GET json
function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// pick first array from OpenFEMA
function pickFirstArray(json) {
  if (!json || typeof json !== "object") return [];
  for (const k of Object.keys(json)) {
    if (Array.isArray(json[k])) return json[k];
  }
  return [];
}

// mapping for claim-like rows
function mapToClaimRow(r, fallbackState) {
  const claimId =
    r.claimId ||
    r.claimID ||
    r.claimNumber ||
    r.claimNo ||
    r.transactionId ||
    r.id ||
    r.recordId ||
    r.propertyId ||
    r.propertyID ||
    "nfip-unknown";

  // state field
  const state =
    r.state ||
    r.stateAbbreviation ||
    r.stateCode ||
    fallbackState ||
    "";

  // date field
  const lossDate =
    r.lossDate ||
    r.dateOfLoss ||
    r.loss_date ||
    r.eventDate ||
    "";

  const year =
    r.yearOfLoss ||
    r.lossYear ||
    r.year ||
    (typeof lossDate === "string" && lossDate.length >= 4 ? lossDate.slice(0, 4) : "");

  // Paid amount key (OpenFEMA NFIP Claims)
  const buildingPaid = Number(r.amountPaidOnBuildingClaim || 0);
  const contentsPaid = Number(r.amountPaidOnContentsClaim || 0);
  const iccPaid = Number(r.amountPaidOnIncreasedCostOfComplianceClaim || 0);

  let paidAmount = 0;
  if (Number.isFinite(buildingPaid)) paidAmount += buildingPaid;
  if (Number.isFinite(contentsPaid)) paidAmount += contentsPaid;
  if (Number.isFinite(iccPaid)) paidAmount += iccPaid;

  // fallback for other shapes (kept, but primary should cover OpenFEMA)
  if (paidAmount === 0) {
    const paidRaw =
      r.paidAmount ||
      r.amountPaid ||
      r.totalAmountPaid ||
      r.totalPaid ||
      r.totalBuildingPaymentAmount ||
      r.totalContentsPaymentAmount ||
      r.netBuildingPaymentAmount ||
      r.netContentsPaymentAmount ||
      r.netIccPaymentAmount ||
      r.amount ||
      0;

    const paid = Number(paidRaw);
    paidAmount = Number.isFinite(paid) ? paid : 0;
  }

  return {
    claimId: String(claimId),
    state: String(state),
    lossDate: lossDate ? String(lossDate).slice(0, 10) : "",
    year: year,
    paidAmount: paidAmount
  };
}

// home
app.get("/", (req, res) => {
  model.getAllWatchlist((err, rows) => {
    const list = rows || [];

    if (list.length > 0) {
      list[0].firstRow = true;
      list[list.length - 1].lastRow = true;
    }

    res.render("home", {
      title: "Flood Claims Insight Dashboard (FCID)",
      watchlist: list,
      hasError: !!err
    });
  });
});

// claims explorer
app.get("/claims", async (req, res) => {
  // read filters
  const filters = {
    state: (req.query.state || "").trim().toUpperCase(),
    from: (req.query.from || "").trim(),
    to: (req.query.to || "").trim(),
    minPaid: (req.query.minPaid || "").trim()
  };
  
  let formError = "";

  // date validation
  const fromYmd = filters.from !== "" ? parseYmd(filters.from) : "";
  const toYmd = filters.to !== "" ? parseYmd(filters.to) : "";
  
  if (filters.from !== "" && !fromYmd) formError = "From date must be in YYYY-MM-DD format.";
  if (!formError && filters.to !== "" && !toYmd) formError = "To date must be in YYYY-MM-DD format.";
  if (!formError && fromYmd && toYmd && fromYmd > toYmd) {
      formError = "From date must be earlier than or equal to To date.";
  }
  
  const currentYear = new Date().getFullYear();
  const minYear = 1978;
    
  if (!formError && fromYmd) {
    const y = parseInt(fromYmd.slice(0, 4), 10);
    if (y < minYear || y > currentYear) formError = `From year must be between ${minYear} and ${currentYear}.`;
  }
  
  if (!formError && toYmd) {
    const y = parseInt(toYmd.slice(0, 4), 10);
    if (y < minYear || y > currentYear) formError = `To year must be between ${minYear} and ${currentYear}.`;
  }
  
  // minPaid validation (optional)
  if (!formError && filters.minPaid !== "") {
    const min = parseFloat(filters.minPaid);
    if (Number.isNaN(min)) formError = "Min paid must be a number.";
    else if (min < 0) formError = "Min paid must be greater than or equal to 0.";
  }
  
  const hasFilters =
  filters.state !== "" ||
  filters.from !== "" ||
  filters.to !== "" ||
  filters.minPaid !== "";

  // results
  let results = [];
  let toastError = "";

  if (hasFilters) {
    // Build OpenFEMA filter
    if (formError) {
      return res.status(400).render("claims", {
        title: "Claims Explorer",
        filters,
        hasFilters,
        hasResults: false,
        results: [],
        toastError: formError
      });
    }

    const parts = [];

    if (filters.state !== "") {
      parts.push(`(state eq '${filters.state}')`);
    }

    // use year range derived from from/to (YYYY-MM-DD)
    const fromYear = filters.from && filters.from.length >= 4 ? parseInt(filters.from.slice(0, 4)) : null;
    const toYear = filters.to && filters.to.length >= 4 ? parseInt(filters.to.slice(0, 4)) : null;

    // claims yearOfLoss try
    const yearFilterParts = [];
    if (fromYear && !Number.isNaN(fromYear)) yearFilterParts.push(`(yearOfLoss ge ${fromYear})`);
    if (toYear && !Number.isNaN(toYear)) yearFilterParts.push(`(yearOfLoss le ${toYear})`);

    const baseFilter = parts.length > 0 ? parts.join(" and ") : "";
    const yearFilter = yearFilterParts.length > 0 ? yearFilterParts.join(" and ") : "";

    const primaryBase = "https://www.fema.gov/api/open/v2/FimaNfipClaims";
    const topN = 25;

    let primaryUrl = `${primaryBase}?$top=${topN}`;
    if (baseFilter || yearFilter) {
      const combined = [baseFilter, yearFilter].filter(Boolean).join(" and ");
      if (combined) primaryUrl += `&$filter=${encodeURIComponent(combined)}`;
    }

    try {
      const json = await getJson(primaryUrl);
      const arr = pickFirstArray(json);

      results = (arr || []).map((r) => mapToClaimRow(r, filters.state));

      // apply minPaid filter
      if (filters.minPaid !== "") {
        const min = parseFloat(filters.minPaid);
        if (!Number.isNaN(min)) {
          results = results.filter((r) => r.paidAmount >= min);
        }
      }

      // format paidAmount for display
      results = results.map((r) => ({
        ...r,
        paidAmount: Number(r.paidAmount).toFixed(2)
      }));
    } catch (e1) {
      toastError = "OpenFEMA is unavailable right now. Please try again.";
      results = [];
    }
  }

  res.render("claims", {
    title: "Claims Explorer",
    filters: filters,
    hasFilters: hasFilters,
    hasResults: results.length > 0,
    results: results,
    toastError: toastError
  });
});

// claim details
app.get("/claims/:id", async (req, res) => {
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

  // load notes + render details
  const loadNotesAndRender = (claimDetails, toastError, noteForm) => {
    model.getNotesByClaimId(id, (err, notes) => {
      const rows = (notes || []).map((n) => {
        const p = n.priority != null ? String(n.priority) : "";
        return {
          ...n,
          isP1: p === "1",
          isP2: p === "2",
          isP3: p === "3",
          isP4: p === "4",
          isP5: p === "5",
          isNoPriority: p === ""
        };
      });

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

  // demo
  if (details) {
    return loadNotesAndRender(details);
  }

  // watchlist fallback
  model.getWatchlistByClaimId(id, async (err, row) => {
    if (err) return res.status(500).send("DB error");

    if (row) {
      const claimDetails = {
        claimId: row.claim_id,
        state: row.state || "",
        lossDate: "",
        year: row.year || "",
        paidAmount: row.amount != null ? Number(row.amount).toFixed(2) : "",
        source: row.source || "watchlist"
      };
      return loadNotesAndRender(claimDetails);
    }

    // OpenFEMA lookup by id
    try {
      const base = "https://www.fema.gov/api/open/v2/FimaNfipClaims";
      const filter = `(id eq '${id}')`;
      const url = `${base}?$top=1&$filter=${encodeURIComponent(filter)}`;

      const json = await getJson(url);
      const arr = pickFirstArray(json);
      const r = arr && arr.length > 0 ? arr[0] : null;

      if (!r) return res.status(404).send("Claim not found");

      const buildingPaid = Number(r.amountPaidOnBuildingClaim || 0);
      const contentsPaid = Number(r.amountPaidOnContentsClaim || 0);
      const iccPaid = Number(r.amountPaidOnIncreasedCostOfComplianceClaim || 0);

      let paidAmount = 0;
      if (Number.isFinite(buildingPaid)) paidAmount += buildingPaid;
      if (Number.isFinite(contentsPaid)) paidAmount += contentsPaid;
      if (Number.isFinite(iccPaid)) paidAmount += iccPaid;

      const lossDate = r.dateOfLoss ? String(r.dateOfLoss).slice(0, 10) : "";

      const claimDetails = {
        claimId: String(r.id || id),
        state: r.state || "",
        lossDate: lossDate,
        year: r.yearOfLoss || "",
        paidAmount: Number(paidAmount).toFixed(2),
        source: "openfema"
      };

      return loadNotesAndRender(claimDetails);
    } catch (e2) {
      return res.status(500).send("API error");
    }
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
      const rows = (notes || []).map((n) => {
        const p = n.priority != null ? String(n.priority) : "";
        return {
          ...n,
          isP1: p === "1",
          isP2: p === "2",
          isP3: p === "3",
          isP4: p === "4",
          isP5: p === "5",
          isNoPriority: p === ""
        };
      });

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

  model.getWatchlistByClaimId(claimId, async (err, row) => {
    if (err) return res.status(500).send("DB error");

    if (row) {
      return renderWithDetails({
        claimId: row.claim_id,
        state: row.state || "",
        lossDate: "",
        year: row.year || "",
        paidAmount: row.amount != null ? Number(row.amount).toFixed(2) : "",
        source: row.source || "watchlist"
      });
    }

    // OpenFEMA lookup
    try {
      const base = "https://www.fema.gov/api/open/v2/FimaNfipClaims";
      const filter = `(id eq '${claimId}')`;
      const url = `${base}?$top=1&$filter=${encodeURIComponent(filter)}`;

      const json = await getJson(url);
      const arr = pickFirstArray(json);
      const r = arr && arr.length > 0 ? arr[0] : null;

      if (!r) return res.status(404).send("Claim not found");

      const buildingPaid = Number(r.amountPaidOnBuildingClaim || 0);
      const contentsPaid = Number(r.amountPaidOnContentsClaim || 0);
      const iccPaid = Number(r.amountPaidOnIncreasedCostOfComplianceClaim || 0);

      let paidAmount = 0;
      if (Number.isFinite(buildingPaid)) paidAmount += buildingPaid;
      if (Number.isFinite(contentsPaid)) paidAmount += contentsPaid;
      if (Number.isFinite(iccPaid)) paidAmount += iccPaid;

      const lossDate = r.dateOfLoss ? String(r.dateOfLoss).slice(0, 10) : "";

      return renderWithDetails({
        claimId: String(r.id || claimId),
        state: r.state || "",
        lossDate: lossDate,
        year: r.yearOfLoss || "",
        paidAmount: Number(paidAmount).toFixed(2),
        source: "openfema"
      });
    } catch (e2) {
      return res.status(500).send("API error");
    }
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

    if (!isLikelyValidClaimId(claimId)) {
    return renderHomeWithError(res, "Invalid Claim ID format.", {
      claim_id: claimId,
      state: state,
      year: yearRaw,
      amount: amountRaw
    });
  }

  if (!isValidState2(state)) {
    return renderHomeWithError(res, "State must be a 2-letter code.", {
      claim_id: claimId,
      state: state,
      year: yearRaw,
      amount: amountRaw
    });
  }
  
  const item = {
    claim_id: claimId,
    state: state.toUpperCase(),
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
  const safeForm = formValues || {};
  let y = safeForm.year != null ? String(safeForm.year).trim() : "";
  if (/^\d{4}$/.test(y)) y = `${y}-01-01`;

  model.getAllWatchlist((err, rows) => {
    const list = rows || [];

    if (list.length > 0) {
      list[0].firstRow = true;
      list[list.length - 1].lastRow = true;
    }

    res.status(400).render("home", {
      title: "Flood Claims Insight Dashboard (FCID)",
      error: errorMessage,
      watchlist: list,
      hasError: !!err,
      form: {
        ...safeForm,
        year: y
      }
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