# Multi-Source Job Search — Design

**Date:** 2026-08-01
**Status:** Approved

## Problem

The app currently pulls real listings from a single source (Adzuna) and pads results
with three hardcoded link-out cards (LinkedIn / Indeed / Monster) that are counted as
jobs. The user wants listings from as many boards as possible, with big-name boards
(LinkedIn, Indeed, Glassdoor) as the priority.

Big-name boards have no public job-search APIs. The legitimate path to their listings
is JSearch (RapidAPI), which queries the Google for Jobs index where those boards'
postings surface, including direct apply links and the publishing board's name.

## Decisions made

- **Goal:** big-name board coverage via JSearch, layered on top of Adzuna (approach A).
- **JSearch access:** user signs up for the free RapidAPI tier (~200 searches/month).
- **Key handling:** paste-in settings field, stored in browser `localStorage`
  (`jsearch_api_key`). No key in repo, bundle, or env vars. Without a key, the app
  runs on Adzuna alone exactly as today.

## Design

### Data layer — `src/services/jobService.ts`

- Job shape gains a field: `{ title, company, url, source }`.
- Two fetchers:
  - **Adzuna** (existing call, unchanged) → `source: "Adzuna"`.
  - **JSearch**: `GET https://jsearch.p.rapidapi.com/search` with
    `query=<title> in <city>` and `date_posted` mapped from the existing filter
    (`any → all`, `24hrs → today`, `week → week`); headers `X-RapidAPI-Key` (from
    localStorage) and `X-RapidAPI-Host: jsearch.p.rapidapi.com`. Results map
    `job_title` → title, `employer_name` → company, `job_apply_link` → url,
    `job_publisher` → source (e.g. "LinkedIn", "Indeed").
- `searchJobs()` runs both fetchers with `Promise.allSettled`, concatenates fulfilled
  results, and dedupes by lowercased `title|company`.
- JSearch is skipped entirely when no key is stored.

### Error handling

- One source failing is tolerated silently (`console.warn`); the other's results show.
- Only when **every attempted source** fails does `searchJobs` throw, and the existing
  UI error message displays.

### UI — `src/components/SearchPage.tsx`

- **Key settings:** an "⚙ API key" toggle reveals a text input; the pasted key is
  saved to `localStorage`. When no key is stored, show a one-line hint:
  "Add a free RapidAPI key to include LinkedIn/Indeed/Glassdoor results."
- **Source badges:** each result card shows its `source`, reusing the existing
  company-line styling.
- **Link-out row:** the three fake board cards are removed from results. A separate
  "Search directly on:" row of plain links (LinkedIn, Indeed, Glassdoor, Monster,
  ZipRecruiter) renders below the grid and is not counted in the results total.
- **Honest count:** "Found N Opportunities" reflects real listings only; zero results
  shows "No jobs found".

### Testing

- Extract merge/dedup as a pure function; one test file covering dedup (case
  differences, same job from two sources) and JSearch result mapping, run by the
  existing `react-scripts test` setup. API calls themselves are not tested.

## Out of scope

- Backend proxy / hiding the Adzuna key (already public; separate concern).
- Paid JSearch tiers, quota tracking, rate limiting.
- Additional aggregators (Jooble, The Muse, USAJobs) — can be added later as more
  fetchers behind the same merge/dedup.
