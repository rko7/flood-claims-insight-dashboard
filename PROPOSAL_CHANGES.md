# Proposal Changes (What Changed and Why)

This file explains differences between the proposal and the current version of the app.
The main reason for these changes is to keep the app stable, simple to use, and easy to demonstrate.

---

## 1) Purpose / “Summaries” vs Current App

### In the proposal
- The app would show clean summaries like:
  - which states had more claims
  - what months were busy
  - how claim amounts changed over time
- Mentioned a small data pipeline that can refresh data on a schedule

### In the app
- The app focuses on:
  - searching claims with filters
  - viewing a claim details page
  - saving items to watchlist
  - adding notes
  - saving/running reports (saved filters)
- No separate “summary dashboard charts” are implemented.
- No scheduled refresh pipeline is implemented.

### Why this changed
- The milestone requirements focus on CRUD actions, validation, MVC structure, and responsiveness.
- Real-time API search + saving user-created data to SQLite was the most reliable way to demonstrate the required actions.

---

## 2) User Actions and Filters (8 actions)

### In the proposal (8 actions)
1. Search claims by filters (state, date range, amount range, cause/field)
2. View claim details
3. Save to watchlist (add)
4. Remove from watchlist (delete)
5. Add a note (create)
6. Edit a note (update)
7. Create a saved report
8. Run or delete a saved report (read + delete)

### In the app
- Search filters implemented:
  - state
  - date range (from/to)
  - amount range (min/max)
  - flood zone
  - cause
- View claim details page implemented
- Watchlist add/delete implemented
- Notes create/update/delete implemented
- Saved reports create/run/delete implemented (run redirects to Claims Explorer with query params)

### What is still different
- The proposal mentions “cause/field”. The app implements **cause**, but does not include a separate “field” filter.

### Why this changed
- “Field” was not clearly defined in the dataset for a simple, user-friendly dropdown filter.
- Cause codes are directly available and easier to explain as a filter.

---

## 3) Responsive Design (Mobile View)

### In the proposal
At 768px and below:
1. Top navigation becomes a hamburger menu
2. Results table becomes stacked cards
3. Filter panel moves from left sidebar to a collapsible “Filters” section

### In the app
At 768px and below:
- Navigation links stack vertically (no hamburger)
- Forms become single-column (labels above inputs)
- Tables switch into stacked “card” rows (using `.stack-table`)
- Filters are not implemented as a collapsible section and are not a left sidebar layout

### Why this changed
- Hamburger menus and collapsible panels usually need extra JavaScript.
- A CSS-only responsive layout is more stable and easier to keep consistent.
- The core goal (readable layout on small screens) is met with fewer moving parts.

---

## 4) Database Schema Differences

The proposal listed strict columns and NOT NULL constraints. The current schema is simplified to work cleanly with API data and the demo flows.

### A) Watchlist table

**In the proposal**
- `loss_date` TEXT NOT NULL
- `paid_amount` REAL NOT NULL
- `created_at` TEXT NOT NULL
- strict required fields

**In the app**
- Stores:
  - `year` (from loss date input or API year)
  - `amount`
  - `saved_at`
  - `source`
- `claim_id` is UNIQUE to prevent duplicates
- Optional fields may exist (ex: `flood_zone`, and sometimes `cause` depending on the current schema)

**Why this changed**
- When saving a claim from the API, not every record reliably provides the exact same fields in an easy, consistent format for the watchlist.
- Using year + amount is enough for the watchlist display and demo actions.
- `source` helps explain where the saved item came from.
- UNIQUE claim_id prevents duplicate saves.

---

### B) Notes table (proposal name: claim_notes)

**In the proposal**
- `note_title` + `note_body`
- priority NOT NULL
- `updated_at`

**In the app**
- Uses:
  - `note_text` (single field)
- priority is optional
- stores `created_at` and updates the row during edit

**Why this changed**
- A single note field is simpler for Mustache templates and the UI.
- Optional priority is more flexible and still supports the required CRUD actions.

---

### C) Saved reports table

**In the proposal**
- state/date_from/date_to/min_paid_amount were NOT NULL (required)

**In the app**
- Report name is required
- Filters are optional and can be empty (NULL):
  - state, from_date, to_date, min_paid, max_paid, flood_zone, cause

**Why this changed**
- Optional filters let users save more types of “saved searches”.
- This makes the feature easier to demonstrate and more useful.

---

## 5) Validation Rule Differences

### A) Saved reports 365-day limit

**In the proposal**
- date_from <= date_to
- date range cannot be longer than 365 days

**In the app**
- Validates:
  - date format
  - From <= To
- Does not enforce the 365-day maximum rule

**Why this changed**
- The core validation needed for stable input handling is date format + correct ordering.
- The extra 365-day rule adds complexity and was not required to demonstrate the main flow.

---

### B) Notes minimum length

**In the proposal**
- note_body must be at least 20 characters

**In the app**
- note_text must be 5 to 300 characters

**Why this changed**
- 20 characters is stricter than needed for short but useful notes.
- 5 still blocks empty/meaningless input and is easier for users.

---

## Summary

The current app supports the proposal’s main workflow:
- search claims
- view details
- save to watchlist
- add/edit notes
- save and re-run a report (saved filters)

Some details were simplified (especially the responsive hamburger/collapsible UI, strict DB constraints, and the scheduled refresh idea) to keep the implementation stable and easy to demonstrate.