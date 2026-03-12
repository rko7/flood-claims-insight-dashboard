# Flood Claims Insight Dashboard (FCID)

FCID is a small Node.js + Express web app that helps explore flood-related claim data, save important claims to a Watchlist, and attach Notes to capture observations and reasoning.

## Features

- **Claims Explorer**
  - Filter claims by **State**, **Date range (From/To)**, **Paid Amount range (Min/Max)**, **Flood Zone**, and **Cause**
  - View claim details
  - Save a claim to the **Watchlist**

- **Watchlist**
  - View saved claims
  - Add a claim manually (with input validation)
  - Delete saved claims
  - Open a saved claim’s details page
  - Flood Zone / Cause can show when available (API data can be missing for some records)

- **Claim Details + Notes**
  - View claim details (watchlist fallback or OpenFEMA lookup)
  - Notes: **Create / Edit / Delete**
  - Notes include an optional **Priority (1 to 5)**

- **Notes List**
  - View all notes in one place
  - Includes basic watchlist info when available

- **Saved Reports**
  - Save a report with filter settings (State, From/To, Min/Max Paid, Flood Zone, Cause)
  - View Results runs the saved filters and redirects to **Claims Explorer**
  - Delete saved reports

## Tech Stack

- Node.js + Express (server)
- Mustache (views/templates)
- SQLite (local database)
- Minimal CSS for styling and responsive layout

## Project Structure

- `app.ctrl.js`  
  Routes and controller logic

- `models/app.model.js`  
  SQLite queries for watchlist, notes, and saved reports

- `views/`  
  Mustache templates  
  Examples: `home.mustache`, `claims.mustache`, `claimDetails.mustache`, `notes.mustache`, `editNote.mustache`, `reports.mustache`, `nav.mustache`

- `public/`  
  Static assets (CSS, images, JS)

## Data Source

Claims are retrieved from the FEMA OpenFEMA API when filters are applied in the Claims Explorer.

## Validation Rules (Examples)

- Claims Explorer
  - Date must be in valid `YYYY-MM-DD` format
  - From date must be earlier than or equal to To date
  - Min/Max paid must be numbers and greater than or equal to 0
  - Min paid must be less than or equal to Max paid (if both provided)
  - Flood Zone and Cause must match allowed formats (if provided)

- Watchlist Add (manual)
  - Claim ID must match a basic allowed format (letters/numbers/hyphen)
  - State must be a 2-letter code
  - Amount must be greater than or equal to 0 (if provided)

- Notes
  - Note text length: **5 to 300** characters
  - Priority: optional, but if provided must be **1 to 5**

## How to Run

1. Install dependencies:
```
npm install
```
2. Start the server:
```
npm start
```
 Alternative
```
node app.ctrl.js
```
3. Open in your browser
- http://localhost:3000


## Notes on Design Changes (vs Proposal)

During implementation, a few parts were adjusted to improve stability and make the app easier to demonstrate.
Most changes focus on simpler UI choices, a safer responsive layout, and a database design that works cleanly with the API.
Details are in `PROPOSAL_CHANGES.md`.