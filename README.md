# Job Search Tool

Search job listings from several sources at once, queue the ones worth applying to, and keep track of what you have already applied to.

Live app: https://adkersonjohn.github.io/job-search-tool

## What it does

- Searches **Adzuna** and, optionally, **JSearch** (a RapidAPI service that surfaces LinkedIn, Indeed and Glassdoor postings).
- Merges both sources and removes duplicates, matching on title + company + location.
- Shows location, salary and posting age on each result where the source provides them.
- **Apply queue** — click `+` on a result to save it for later. The queue survives a page reload.
- **Applied tracking** — click the check on a result or queue row to mark it applied. Applied jobs get a green highlight and an "Already applied" badge next time they show up in results, so you don't apply twice.
- Direct link-outs to LinkedIn, Indeed, Glassdoor, Monster and ZipRecruiter for the same search.

Everything is stored in your browser's `localStorage`. There is no backend, no account, and no data leaves your machine except the search terms sent to the job APIs.

## Setup

```bash
npm install
npm start
```

Then open the app and click **⚙ API keys**. You need at least one key — both are free.

### Adzuna (recommended, gives you the base results)

1. Register at https://developer.adzuna.com/
2. Copy your **App ID** and **App Key** into the settings panel and click **Save keys**.

### JSearch via RapidAPI (optional, adds LinkedIn/Indeed/Glassdoor)

1. Subscribe to the free tier at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Copy your RapidAPI key into the settings panel and click **Save keys**.

The free JSearch tier is roughly 200 requests/month. The app does not rate-limit you — if searches start failing with a partial-results warning, you have probably hit the monthly cap.

Keys are stored only in your own browser and are only ever sent to the API they belong to. Nothing is committed to the repo, and there are no environment variables to configure.

## Available scripts

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on http://localhost:3000 |
| `npm test` | Jest + React Testing Library suite |
| `npm run build` | Production build into `build/` |
| `npm run deploy` | Build and publish to GitHub Pages |

## Project structure

```
src/
  App.tsx                      shell
  App.css                      all styles
  components/
    SearchPage.tsx             the entire UI — search, results, queue, settings
    SearchPage.test.tsx
  services/
    jobService.ts              API calls, key storage, source merging
    jobUtils.ts                Job type, dedupe, applied/queue logic, formatting
    jobUtils.test.ts
```

## Apply queue automation (optional)

`.claude/commands/apply-queue.md` is a [Claude Code](https://claude.com/claude-code) skill that drives a real browser through the queued applications, filling forms from a local profile file. It is specific to the repo owner's machine — paths and the profile file are not included here. The app works fine without it; the queue and applied list are both fully usable from the UI.
