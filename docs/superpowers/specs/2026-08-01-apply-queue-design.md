# Apply Queue + Semi-Automated Applications — Design

**Date:** 2026-08-01
**Status:** Approved

## Problem

Applying to jobs found in the app is fully manual. The user wants the application
process automated as much as reasonably possible.

## Decisions made

- **Autonomy:** auto-submit when every required form question has a known answer;
  pause and ask the user only for unknowns (answers are then remembered).
- **Profile:** standard application data lives in a local, gitignored
  `apply-profile.json`; never committed.
- Fully unattended bulk submission rejected (application quality + platform-ban risk).
- The deployed site cannot drive the browser; automation runs in Claude Code
  sessions via the browser-attach setup (user's real logged-in Chrome, CDP 9222).

## Design

### 1. App: apply queue (SearchPage + jobUtils + App.css)

- Each result card gets a queue toggle button (lucide `Plus` → `Check` when queued)
  that stops link navigation and toggles the job in the queue.
- Queue = `Job[]` persisted in localStorage under `apply_queue`, keyed by `url`.
- Pure helper `toggleQueued(queue, job)` in `jobUtils.ts` (unit-tested).
- A "Queued (N)" section renders whenever the queue is non-empty (including on
  fresh page load): one row per job (title — company, source badge, `X` remove
  button) plus a "Clear queue" link-style button.

### 2. Local profile: `apply-profile.json` (gitignored)

Created by a one-time interview in-session. Shape:

```json
{
  "name": "", "email": "", "phone": "", "location": "",
  "linkedin": "", "portfolio": "",
  "workAuthorized": true, "needsSponsorship": false,
  "salaryExpectation": "", "yearsExperience": "",
  "resumePath": "C:\\path\\to\\resume.pdf",
  "answers": { "<normalized question>": "<saved answer>" }
}
```

`answers` is the growing bank: any question the user answers mid-session is
appended so later sessions need fewer pauses.

### 3. Session workflow: `.claude/commands/apply-queue.md`

Slash command instructing any future session to:
1. Ensure `apply-profile.json` exists (interview the user if not).
2. Launch browser-attach Chrome; open the deployed site; read `apply_queue`
   from localStorage.
3. For each queued job: open its URL, identify the flow (LinkedIn Easy Apply,
   Indeed, Greenhouse, Lever, Workday, other), fill fields from the profile,
   upload the resume.
4. Auto-submit when all required questions map to profile data/answers bank;
   otherwise ask the user, save the new answer to `answers`, then submit.
5. CAPTCHAs / logins / MFA: never bypass — the browser is visible; wait for the
   user to handle them, then continue.
6. Log every outcome (applied / skipped+reason) to gitignored `applied-log.json`;
   remove applied jobs from the site's `apply_queue` via localStorage.
7. Pace LinkedIn submissions (~30–60s apart) to stay within normal usage.
8. Clean up: close attach Chrome, delete test artifacts.

## Out of scope

- Unattended "guess unknown answers" mode.
- Any server-side component; everything stays local.
- CAPTCHA/anti-bot circumvention.
