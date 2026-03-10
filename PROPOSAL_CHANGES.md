# Proposal Changes (What Changed and Why)

This file explains differences between the proposal and the current version of the app.
The main reason for these changes is to keep the app stable, simple to use, and easy to demonstrate.

---

## 1) User Actions and Filters

### In the proposal
- More filter options in Claims Explorer
  - Amount range (Min and Max)
  - Extra fields (example: cause / field filters)

### In the app
- Claims Explorer filters are:
  - State
  - Date range (From/To)
  - Min Paid ($)

### Why this changed
- More filters means more edge cases and more input validation rules.
- Some fields are not consistent in the API data, so a filter can easily break or return confusing results.
- A smaller set of filters is easier to test and still supports the core flow:
  **search → view → save**.

---

## 2) Responsive Design (Mobile View)

### In the proposal
At 768px and below:
- Top nav becomes a hamburger menu
- Results table becomes stacked cards
- Filters move to a collapsible section

### In the app
At 768px and below:
- Navigation links stack vertically
- Forms become single-column (labels above inputs)
- Tables change into stacked "card" rows (using `.stack-table`)

### Why this changed
- Hamburger menus and collapsible panels usually need extra JavaScript and can be buggy.
- A CSS-only responsive layout is more stable and easier to keep consistent.
- The main goal is clear mobile readability, and the current layout achieves that.

---

## 3) Database Schema Differences

### A) Watchlist table

**In the proposal**
- Columns focused on:
  - `loss_date`, `paid_amount`, `created_at`

**In the app**
- Columns focus on:
  - `year`, `amount`, `saved_at`, `source`
- `claim_id` is **UNIQUE** to prevent duplicates

**Why this changed**
- Not all saved claims always have a reliable loss date available at save time.
- Storing `year` is enough for basic organization and display.
- `source` helps explain where the item came from (manual save or claims search).
- `claim_id UNIQUE` improves user experience by blocking duplicate saves.

---

### B) Notes table (proposal name: claim_notes)

**In the proposal**
- Notes had separate fields:
  - `note_title`, `note_body`
- `priority` was required (NOT NULL)
- `updated_at` existed

**In the app**
- Notes use:
  - `note_text` (single field)
- `priority` is optional
- Uses `created_at` and relies on edit flow for updates

**Why this changed**
- A single `note_text` is simpler for users and simpler to render in Mustache.
- Optional priority is more flexible (some notes do not need a priority number).
- Keeping the table simple reduces code complexity while still supporting CRUD.

---

### C) Saved Reports table

**In the proposal**
- Filters were stricter (often required / NOT NULL):
  - state, from, to, min paid amount

**In the app**
- Saved report filters are optional:
  - state, from_date, to_date, min_paid can be empty (NULL)

**Why this changed**
- Saved reports are more useful when they support many combinations:
  - Only state
  - Only min paid
  - Only date range
  - Any mix of filters
- Making all fields required would block simple report saves.

---

## 4) Validation Rule Differences

### A) Saved reports date range limit

**In the proposal**
- Date range limited to 365 days (max)

**In the app**
- Checks:
  - valid date format
  - From <= To
- No 365-day maximum rule

**Why this changed**
- The 365-day rule is not required for the main features.
- It can block valid use cases and makes the app feel strict for no strong benefit.
- Keeping validation focused on correctness (format and order) is simpler and clearer.

---

### B) Notes minimum length

**In the proposal**
- `note_body` minimum length was 20 characters

**In the app**
- `note_text` must be 5 to 300 characters

**Why this changed**
- 20 characters can be too strict for short but useful notes.
- 5 characters still blocks empty or meaningless input.
- The 5 to 300 range is easier for users and still prevents very short or very long text.

---

## 5) Data pipeline / Scheduled refresh

### In the proposal
- Mentioned a small data pipeline and refresh on a schedule

### In the app
- Claims data is pulled in real time from the API when the user searches.
- Local storage is used for:
  - watchlist
  - notes
  - saved reports
- No scheduled refresh process is included

### Why this changed
- Scheduled refresh is not needed to support the main user flow.
- Real-time API search keeps data current without background jobs.
- Adding scheduling would increase complexity and is outside the core app goal.

---

## Summary

The current app still follows the main idea from the proposal:
- Explore claims
- Save important ones to a watchlist
- Add notes to explain why they matter
- Save report filters to quickly repeat a search

Some details changed to reduce risk, improve stability, and keep the core flow clear.