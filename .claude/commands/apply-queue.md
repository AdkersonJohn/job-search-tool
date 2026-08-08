---
description: Work the job apply queue — drive browser-attach Chrome through queued jobs, auto-filling from apply-profile.json
---

# Work the Apply Queue

Semi-automated job applications. Autonomy policy (user-approved): **auto-submit when
every required question has a known answer; pause and ask only for unknowns, then
remember the answer.** Never bulk-submit blindly.

## 1. Profile

Read `apply-profile.json` (repo root, gitignored). If missing, interview the user and
create it:

```json
{
  "name": "", "email": "", "phone": "", "location": "",
  "linkedin": "", "portfolio": "",
  "workAuthorized": true, "needsSponsorship": false,
  "salaryExpectation": "", "yearsExperience": "",
  "resumePath": "C:\\path\\to\\resume.pdf",
  "answers": {}
}
```

Verify `resumePath` exists before starting.

## 2. Setup

1. Launch the user's Chrome: `powershell -ExecutionPolicy Bypass -File "C:\Users\JohnBoi\Documents\Code\browser-attach\scripts\start-chrome.ps1"` (CDP on 9222; persistent logged-in profile). Drive it via the Playwright MCP tools.
2. Navigate to https://adkersonjohn.github.io/job-search-tool and read the queue:
   `JSON.parse(localStorage.getItem('apply_queue') ?? '[]')`.
3. If the queue is empty, tell the user and stop.

## 3. Per job

1. Open the job URL (Adzuna URLs redirect to the original posting — follow through).
2. Identify the flow: LinkedIn Easy Apply / LinkedIn external / Indeed / Greenhouse /
   Lever / Workday / other ATS. Read the actual form; do not assume field names.
3. Fill every field from the profile; upload the resume from `resumePath`
   (browser_file_upload).
4. Multi-step wizards: advance step by step, filling each page.
5. **Submit policy:** if all required questions were answered from the profile or its
   `answers` bank → submit without asking. If any question has no known answer →
   ask the user, write their answer into `answers` in apply-profile.json (normalize
   the question to a short lowercase key), then submit.
6. **Never bypass** CAPTCHAs, logins, or MFA. The browser is visible — tell the user
   what needs a human, wait for them to do it, continue.
7. **Skip and log** (with reason) anything hard-blocked: account-creation-required
   ATS the user declines, dead links, already-applied notices.
8. Pace LinkedIn submissions ~30–60s apart (do other queue items or wait). Do not
   machine-gun applications on any single platform.

## 4. Bookkeeping

- Append every outcome to `applied-log.json` (repo root, gitignored):
  `{ "url", "appliedUrl", "title", "company", "location", "source", "status": "applied" | "skipped", "reason?", "timestamp" }`
  - `url` is the **posting url from the queue entry**, unmodified. It is the identity
    the UI matches on — never overwrite it with the ATS url you ended up on.
  - `appliedUrl` is where the application was actually submitted (Workday, Greenhouse,
    …). Record-keeping only; the UI ignores it.
- Remove successfully applied (and permanently-skipped) jobs from the site queue:
  write the filtered array back with `localStorage.setItem('apply_queue', ...)` on
  the site's tab.
- Append each applied job to the site's `applied_jobs` localStorage list on the same
  tab by **copying the queue entry verbatim** — do not rebuild the object or drop
  fields. `location` in particular must survive, or the record cannot be matched
  precisely later.
- How the UI matches (`isSameJob` in `src/services/jobUtils.ts`): same canonical url
  (host + path, query stripped), **or** title + company + location all present and
  equal. A record missing `location` can only ever be matched by url. Matching is
  deliberately strict — a wrong "Already applied" badge hides a job the user could
  have applied to, and there is no way to clear one from the UI.

## 5. Wrap up

- Summarize: applied / skipped / needs-user counts with links.
- Close the attach Chrome (unauthenticated debug socket) and delete any
  screenshots/artifacts created during the run.
