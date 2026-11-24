# Public Replies and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add public replies to each letter and send email notifications through Resend when letters or replies are created.

**Architecture:** Replies are stored in a MongoDB `Reply` collection and exposed through the existing Express API. The public letter page loads and posts replies; the dashboard can view and delete them. After a successful database write, the server calls Resend; email failure is logged and reported without undoing the database write.

**Tech Stack:** Express, Mongoose, MongoDB Atlas, Resend HTTP API, vanilla JavaScript, existing Render deployment.

**Spec:** `docs/superpowers/specs/2026-11-23-letters-dashboard-design.md` plus the approved conversation decisions.

## Global Constraints

- Public replies are visible to anyone viewing the letter.
- Reply content is rendered as text, never HTML.
- Reply names are limited to 80 characters; reply messages to 2,000 characters.
- Letter creation must succeed even if email delivery fails.
- Resend credentials stay in Render environment variables and never reach the browser.
- Public reply creation is rate-limited per IP.
- Existing CRUD, dashboard, Vercel support, and local development must continue working.

## Review Focus

1. Empty, oversized, or HTML reply input is rejected or safely rendered.
2. Unknown or malformed letter IDs return the correct API errors.
3. Public reply spam is throttled without affecting public reads.
4. Resend outages do not roll back a saved letter or reply.
5. Dashboard deletion cannot delete a reply belonging to another letter.

### Tasks

1. Add reply validation/model and Resend notification helper with tests.
2. Add reply CRUD routes, rate limiting, and notification hooks with API tests.
3. Add public reply UI to the letter page and API client methods.
4. Add dashboard reply viewing/deletion and notification status feedback.
5. Add Render environment-variable documentation and run the full test/build verification.
