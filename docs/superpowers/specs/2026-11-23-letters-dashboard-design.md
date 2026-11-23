# Letters Dashboard — Design

Date: 2026-11-23
Status: Proposed (awaiting approval)

## Context

`lettersToMyLove` is a Moracarta-based static love-letter site. Letters are
plain objects `{ id, date, title, content }` imported at build time from
`src/content/letters.js` (with `letters.example.js` as fallback). Envelope
colors are generated from `id | title | date`. The site has two pages:

- `index.html` — envelope grid, newest letter first.
- `src/views/letters.html?id=N` — single letter with envelope-opening animation
  and previous/next navigation.

There is no server and no database. Adding a letter currently means editing
`letters.js` (or running the `moracarta add` CLI) and rebuilding.

## Intent

Add a small, password-protected dashboard for writing letters through the
browser, backed by Node.js and MongoDB Atlas, and make the public site read
letters live from that database. The dashboard should feel like a simple form,
not a CMS.

## Goals

- Create, read, update, and delete letters from a web dashboard.
- Public site loads letters from the API at runtime, so edits appear
  immediately without a rebuild.
- One Express process can serve both the API and the built site.
- Local-first, but deployable to a single Node host later.
- Preserve the existing visual design and animations.

## Non-goals

- Multi-user accounts, roles, or permissions.
- Image uploads or attachments.
- Rich-text/WYSIWYG editing.
- Drag-to-reorder letters.
- Google Docs import in the dashboard (existing service stays untouched).
- Comments, reactions, analytics, search.
- Deployment to a specific host now.

## Anti-goals

- Do not require a rebuild after writing a letter.
- Do not ship the admin password or database credentials to the browser.
- Do not break the envelope animations or the existing look.
- Do not delete or rewrite the user's existing content files.

## Decisions made by the user

| Decision | Choice |
| --- | --- |
| Public letter source | Live from MongoDB via API |
| Dashboard access | Single password from `.env` |
| Google Docs import | Skip for now |
| Hosting | Local now; Express can serve the built site later |
| Existing `add` / `remove` CLI | Deprecate with a guard |

## Decisions made by the builder

These are the builder's calls. They are listed so they can be rejected while
reading.

- Dashboard and API use vanilla JS/HTML/CSS; no frontend framework.
- Dashboard lives at `/dashboard.html`, a single page with a list and an
  inline create/edit form.
- API responses expose `id` as the Mongo `_id` string; the letter URL becomes
  `letters.html?id=<objectId>`.
- Dates are stored as UTC midnight `Date` values, and the API returns both a
  display label (`"Aug 28, 2026"`) and `dateISO` (`"2026-08-28"`).
- Letters sort by `date` ascending, then `createdAt` ascending. The main page
  reverses that list, so newest appears first.
- The server fails fast at startup if `MONGODB_URI` or `ADMIN_PASSWORD` is
  missing.
- No CORS package: development uses the Vite proxy and production is
  same-origin, so CORS is unnecessary.
- A non-destructive seed script copies the five example letters into an empty
  collection; `--force` wipes and re-seeds.
- Letter content is rendered as text, not HTML, on public pages.
- On `PUT`, an omitted `date` preserves the stored date; it never resets to
  "now". The dashboard requires a date and defaults it to today.
- The letter page distinguishes a missing/unknown id (404 → "Letter not
  found") from an API/network failure ("Could not load letter" + retry).

## Architecture

```
Browser ──► Express (Node 24, ESM) ──► MongoDB Atlas
   │                 │
   ├─ public pages:  GET /api/letters
   └─ dashboard:     POST / PUT / DELETE /api/letters (+ password)
```

Development:

- Vite on `http://localhost:5173` serves the site and proxies `/api` to
  Express on `http://localhost:4000`.
- Dashboard is available at `http://localhost:5173/dashboard.html`.

Production:

- `npm run build` produces `dist/`.
- `npm start` runs Express, which serves `dist/` and the API from one port.
- Database and password come from environment variables.

## Project structure

```
server/
├── index.js                 # Express app, static dist, startup
├── config.js                # dotenv load + env validation
├── db.js                    # mongoose connection
├── models/Letter.js         # Mongoose schema
├── middleware/requireAdmin.js
├── routes/letters.js        # CRUD + auth verify
├── routes/health.js         # or inline in index.js
└── scripts/seed.js          # optional seeding

dashboard.html               # new dashboard entry
src/
├── services/lettersApi.js   # fetch wrapper for public + admin calls
├── scripts/dashboard.js     # dashboard UI logic
├── styles/dashboard.css     # dashboard styles
├── scripts/main.js          # modified: async fetch + states
└── scripts/lettersPage.js   # modified: async fetch + string ids

.env.example                 # committed placeholders
.env                         # local secrets, gitignored
```

## Data model

Mongoose `Letter`:

| Field | Type | Rules |
| --- | --- | --- |
| `title` | String | required, trimmed, max 200 |
| `content` | String | required, max 50,000 |
| `date` | Date | required, defaults to now; normalized to UTC midnight |
| `createdAt` | Date | automatic |
| `updatedAt` | Date | automatic |

Index: `{ date: 1, createdAt: 1 }`.

API letter shape:

```json
{
  "id": "665f1c2a9b1e4c0012a34567",
  "title": "Custom Letter Title 1",
  "content": "My Dearest...",
  "date": "Aug 28, 2026",
  "dateISO": "2026-08-28",
  "createdAt": "2026-08-28T00:00:00.000Z",
  "updatedAt": "2026-08-28T00:00:00.000Z"
}
```

`date` is formatted in UTC with `Intl.DateTimeFormat("en-US", { month:
"short", day: "numeric", year: "numeric", timeZone: "UTC" })`.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | `{ ok: true }` |
| GET | `/api/letters` | public | List all letters |
| GET | `/api/letters/:id` | public | One letter or 404 |
| POST | `/api/auth/verify` | admin | Verify dashboard password |
| POST | `/api/letters` | admin | Create |
| PUT | `/api/letters/:id` | admin | Update |
| DELETE | `/api/letters/:id` | admin | Delete |

Admin auth: header `x-admin-password`, compared against `ADMIN_PASSWORD`
using a constant-time comparison. Missing/wrong password → `401`. If the
environment variable is absent, the server refuses to start.

Create/update body:

```json
{ "title": "string", "content": "string", "date": "2026-08-28" }
```

- `title` and `content` are required and trimmed.
- `date` is optional; invalid values → `400`. On create it defaults to now; on
  update an omitted `date` preserves the existing value.
- Responses use the API letter shape above.
- Unknown `:id` → `404`. Invalid ObjectId → `400`.
- JSON body limit: 100 kB.
- All errors return `{ "error": "message" }`.

## Backend behavior

`server/index.js`:

1. Load and validate env (`server/config.js`).
2. Connect to Mongo (`server/db.js`); fail with a clear message if Atlas is
   unreachable, including a hint about Atlas IP allowlisting.
3. Mount `express.json({ limit: "100kb" })`, `/api` routes, and an error
   handler.
4. If `dist/` exists, serve it statically. Otherwise, `GET /` returns a short
   hint to run `npm run build`.
5. Start listening on `PORT` (default `4000`).
6. Handle `SIGINT`/`SIGTERM` by closing the HTTP server and Mongo connection.

## Frontend data layer

`src/services/lettersApi.js`:

- `const API_BASE = import.meta.env.VITE_API_URL ?? ""` (empty means
  same-origin; Vite proxy handles development).
- `getLetters()`, `getLetter(id)` — public.
- `verifyPassword(password)`, `createLetter(data, password)`,
  `updateLetter(id, data, password)`, `deleteLetter(id, password)` — admin,
  sending `x-admin-password`.
- Throws an `ApiError` carrying HTTP status and server message.
- No secrets in this file.

## Public site changes

`src/scripts/main.js`:

- Fetch letters asynchronously instead of importing them.
- Show a loading state in `#letter-list`, then render.
- Empty state: a quiet message such as "No letters yet.".
- Error state: "Could not load letters." with a retry button.
- Keep reverse ordering (newest first).
- Escape interpolated `title` and `date` before inserting into the envelope
  markup.

`src/scripts/lettersPage.js`:

- Wrap initialization in an async function; fetch the letter by the `id`
  query parameter (string, not integer).
- If the id is missing/unknown, show the existing "Letter not found" state.
- If the fetch fails (network/server error), show a distinct "Could not load
  letter" message with a retry button; do not imply the letter was deleted.
- Render body paragraphs as text nodes (`<p>` + `textContent`), preserving the
  current paragraph splitting on blank lines.
- Start the envelope animation only after data is available.
- Previous/next navigation follows the API order.
- Set `document.title` after loading.

`src/loaders/lettersLoader.js` becomes unused. Leave the file in place; do not
delete it.

## Dashboard behavior

`/dashboard.html`:

1. **Password gate** — one password input and an "Open dashboard" button.
   On success, store the password in `sessionStorage` and show the dashboard.
   A `401` from any admin call clears it and returns to the gate.
2. **Header** — title, letter count, and a "New letter" button.
3. **Letter list** — newest first, each row shows title, display date, a short
   content preview, and Edit/Delete buttons.
4. **Form** — shared for create and edit:
   - Title: text input, required.
   - Date: `<input type="date">`, defaults to today.
   - Content: textarea, required, roomy.
   - Save and Cancel. Client-side validation with inline messages.
5. **Delete** — confirmation naming the letter title.
6. **Feedback** — inline status/toast messages for success and failure; loading
   states for list and submit; disable buttons while a request is in flight.
7. **Empty state** — "No letters yet. Write the first one."

Styling: reuse the site's warm palette and serif fonts from `main.css`, but
keep the dashboard layout clean and functional. Responsive down to phone width.
Labels and focus states for accessibility; `aria-live` for status messages.

## Configuration

`.env.example`:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
MONGODB_DB=letters
PORT=4000
ADMIN_PASSWORD=change-me
```

- `.env` is gitignored; `.env.example` is committed.
- `MONGODB_DB` is optional and overrides the database name from the URI.
- The user supplies the Atlas connection string.

## Scripts

```json
{
  "dev": "vite --config vite.config.mjs",
  "server": "node --watch server/index.js",
  "dev:all": "concurrently -k -n api,web \"npm:server\" \"npm:dev\"",
  "start": "node server/index.js",
  "seed": "node server/scripts/seed.js",
  "build": "vite build --config vite.config.mjs",
  "test": "node --test"
}
```

`vite.config.mjs` adds:

- `server.proxy["/api"] = "http://localhost:4000"`.
- `dashboard` as a Rollup input so `dashboard.html` is built.

On this Windows machine PowerShell blocks `npm.ps1`. Use `npm.cmd` or adjust
the execution policy; this is documented in the README.

## Existing CLI workflow

`moracarta add` and `moracarta remove` currently edit `src/content/letters.js`,
which the live site will no longer read. They are deprecated with a guard:

- Both commands print a short notice that this project now stores letters in
  MongoDB and point to `/dashboard.html`, then exit with a non-zero code.
- They do not write to `letters.js` anymore.
- The README explains that the dashboard replaces them.
- `src/content/letters.example.js` stays as the seed source.
- `src/services/googleDocs.js` stays untouched.

## Seed script

`npm run seed`:

- Imports `src/content/letters.example.js`.
- Parses its display dates; falls back to the current date if a string cannot
  be parsed.
- Inserts the five letters only when the collection is empty.
- `npm run seed -- --force` deletes all letters first, then re-seeds.
- Prints how many letters were inserted and exits non-zero on failure.

## Verification

1. `npm test` — existing tests still pass.
2. `npm run build` — build includes `index.html`, `dashboard.html`, and the
   letter view.
3. With a valid `.env`: `npm run seed`, then `npm run dev:all`.
4. Public site shows seeded letters; opening an envelope works; previous/next
   works; no console errors.
5. Dashboard: wrong password rejected; create a letter → appears on the public
   site after refresh; edit it → changes appear; delete it → disappears.
6. Empty database shows the empty state, not an error.
7. Stop the API → public site shows the error state, not a blank page.
8. `npm run build && npm start` → site and API work on one port.

Optional automated tests: small `node:test` cases for date formatting and
validation helpers. Full API integration tests are out of scope for this
iteration because they would require an in-memory MongoDB binary.

## Security notes

- The password is sent in a header. Locally this is HTTP; any real deployment
  must use HTTPS.
- No rate limiting in this iteration; acceptable for a single-admin local tool.
  Add `express-rate-limit` before exposing it publicly.
- Public reads are intentionally unauthenticated.
- Content is rendered as text, so stored HTML cannot execute in the browser.
- `.env` is never imported by client code.

## Risks and open operational notes

- Atlas must allow the machine's IP (or `0.0.0.0/0`) in Network Access.
- The existing Cloudflare/Wrangler deploy path is static and cannot serve live
  data. Production now means a Node host running `npm start`. The old deploy
  command stays untouched for reference.
- Changing letter ids from numbers to ObjectId strings changes the generated
  envelope colors for the example letters. Colors remain stable after that.
- `src/services/googleDocs.js` remains in the repo but is not wired into the
  dashboard.

## Out of scope for this iteration

Google Docs import, multi-user accounts, rich text, images, reordering,
drafts/publishing states, comments, and deployment automation.
