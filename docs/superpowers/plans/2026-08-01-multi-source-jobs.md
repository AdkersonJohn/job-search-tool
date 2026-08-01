# Multi-Source Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSearch (RapidAPI) as a second job source layered on Adzuna, with a paste-in API key, merged/deduped results, source badges, and an honest link-out row.

**Architecture:** Pure merge/dedup/mapping helpers live in a new `src/services/jobUtils.ts` (no axios import, so tests avoid CRA's axios-ESM jest problem). `src/services/jobService.ts` keeps the API calls: two fetchers run under `Promise.allSettled`; JSearch is skipped when no key is in localStorage. `src/components/SearchPage.tsx` gains a key-settings toggle, source badges, a "Search directly on:" link row, and a real empty state.

**Tech Stack:** Create React App (react-scripts 5, TypeScript 4.9, React 19), axios, jest via `react-scripts test`. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-multi-source-jobs-design.md`
- No new npm packages.
- No API keys in repo, bundle, or env vars — JSearch key comes from `localStorage` key `jsearch_api_key` only.
- Existing Adzuna behavior (URL-encoding, `company?.display_name ?? 'Unknown'` guard) must be preserved.
- Work on branch `feature/multi-source-jobs`. Commit per task with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Match existing code style: arrow-function components, template-literal URLs, existing CSS class naming (kebab-case).

---

### Task 1: Pure helpers — `jobUtils.ts` (dedup + JSearch mapping)

**Files:**
- Create: `src/services/jobUtils.ts`
- Test: `src/services/jobUtils.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2 and 3):
  - `export type Job = { title: string; company: string; url: string; source: string }`
  - `export const dedupeJobs: (jobs: Job[]) => Job[]` — first occurrence wins; key is lowercased/trimmed `title|company`.
  - `export const mapJSearchJobs: (results: any[] | undefined | null) => Job[]` — maps JSearch API objects to `Job`, drops entries with no apply link.

- [ ] **Step 1: Write the failing tests**

Create `src/services/jobUtils.test.ts`:

```ts
import { dedupeJobs, mapJSearchJobs, Job } from './jobUtils';

const job = (title: string, company: string, source = 'Adzuna'): Job => ({
  title,
  company,
  url: 'https://example.com/x',
  source,
});

describe('dedupeJobs', () => {
  it('removes duplicates that differ only by case/whitespace, keeping the first', () => {
    const jobs = [job('Software Engineer', 'Acme', 'Adzuna'), job('  software engineer ', 'ACME', 'LinkedIn')];
    const result = dedupeJobs(jobs);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('Adzuna');
  });

  it('keeps jobs with the same title at different companies', () => {
    const result = dedupeJobs([job('Engineer', 'Acme'), job('Engineer', 'Globex')]);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(dedupeJobs([])).toEqual([]);
  });
});

describe('mapJSearchJobs', () => {
  it('maps JSearch fields to Job', () => {
    const result = mapJSearchJobs([
      {
        job_title: 'React Developer',
        employer_name: 'Initech',
        job_apply_link: 'https://linkedin.com/jobs/1',
        job_publisher: 'LinkedIn',
      },
    ]);
    expect(result).toEqual([
      { title: 'React Developer', company: 'Initech', url: 'https://linkedin.com/jobs/1', source: 'LinkedIn' },
    ]);
  });

  it('fills fallbacks for missing fields and drops entries without an apply link', () => {
    const result = mapJSearchJobs([
      { job_apply_link: 'https://indeed.com/jobs/2' },
      { job_title: 'No Link Job', employer_name: 'Acme' },
    ]);
    expect(result).toEqual([{ title: 'Untitled', company: 'Unknown', url: 'https://indeed.com/jobs/2', source: 'Web' }]);
  });

  it('returns empty array for undefined/null input', () => {
    expect(mapJSearchJobs(undefined)).toEqual([]);
    expect(mapJSearchJobs(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx react-scripts test --watchAll=false src/services/jobUtils.test.ts`
Expected: FAIL — cannot find module `./jobUtils`.

- [ ] **Step 3: Write the implementation**

Create `src/services/jobUtils.ts`:

```ts
export type Job = { title: string; company: string; url: string; source: string };

export const dedupeJobs = (jobs: Job[]): Job[] => {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.title.trim().toLowerCase()}|${job.company.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const mapJSearchJobs = (results: any[] | undefined | null): Job[] =>
  (results ?? [])
    .map((r: any) => ({
      title: r.job_title ?? 'Untitled',
      company: r.employer_name ?? 'Unknown',
      url: r.job_apply_link,
      source: r.job_publisher ?? 'Web',
    }))
    .filter((j) => j.url);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx react-scripts test --watchAll=false src/services/jobUtils.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/jobUtils.ts src/services/jobUtils.test.ts
git commit -m "feat: add job dedup and JSearch mapping helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Multi-source `searchJobs` in `jobService.ts`

**Files:**
- Modify: `src/services/jobService.ts` (full rewrite of the file, currently ~45 lines)

**Interfaces:**
- Consumes: `Job`, `dedupeJobs`, `mapJSearchJobs` from `./jobUtils` (Task 1).
- Produces (used by Task 3):
  - `export const searchJobs: (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week') => Promise<Job[]>` — throws only when every attempted source fails.
  - `export const getJSearchKey: () => string` — returns `''` when unset.
  - `export const setJSearchKey: (key: string) => void` — trims and persists to localStorage.

- [ ] **Step 1: Replace the contents of `src/services/jobService.ts`**

```ts
import axios from 'axios';
import { Job, dedupeJobs, mapJSearchJobs } from './jobUtils';

const ADZUNA_APP_ID = "085d8a01";
const ADZUNA_API_KEY = "8fbd3b9536418b89512a0b9c712a38c6";
const ADZUNA_BASE_URL = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}&results_per_page=50`;

const JSEARCH_KEY_STORAGE = 'jsearch_api_key';

export const getJSearchKey = (): string => localStorage.getItem(JSEARCH_KEY_STORAGE) ?? '';

export const setJSearchKey = (key: string): void => {
  localStorage.setItem(JSEARCH_KEY_STORAGE, key.trim());
};

const fetchAdzuna = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week'): Promise<Job[]> => {
  let adzunaUrl = `${ADZUNA_BASE_URL}&what=${encodeURIComponent(jobTitle)}&where=${encodeURIComponent(city)}`;

  if (dateFilter === '24hrs') {
    adzunaUrl += '&max_days_old=1';
  } else if (dateFilter === 'week') {
    adzunaUrl += '&max_days_old=7';
  }

  const response = await axios.get(adzunaUrl);
  return (response.data.results ?? []).map((job: any) => ({
    title: job.title,
    company: job.company?.display_name ?? 'Unknown',
    url: job.redirect_url,
    source: 'Adzuna',
  }));
};

const fetchJSearch = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week', key: string): Promise<Job[]> => {
  const datePosted = dateFilter === '24hrs' ? 'today' : dateFilter === 'week' ? 'week' : 'all';
  const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: { query: `${jobTitle} in ${city}`, date_posted: datePosted },
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
  });
  return mapJSearchJobs(response.data.data);
};

export const searchJobs = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week'): Promise<Job[]> => {
  const key = getJSearchKey();
  const fetchers = [fetchAdzuna(jobTitle, city, dateFilter)];
  if (key) {
    fetchers.push(fetchJSearch(jobTitle, city, dateFilter, key));
  }

  const settled = await Promise.allSettled(fetchers);
  settled.forEach((result) => {
    if (result.status === 'rejected') console.warn('Job source failed:', result.reason);
  });

  if (settled.every((result) => result.status === 'rejected')) {
    throw new Error('All job sources failed');
  }

  const jobs = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  return dedupeJobs(jobs);
};
```

Note: the three hardcoded LinkedIn/Indeed/Monster mock entries are deliberately gone from this file — Task 3 replaces them with a link-out row in the UI.

- [ ] **Step 2: Verify compile and existing tests**

Run: `npx tsc --noEmit` then `npx react-scripts test --watchAll=false`
Expected: no type errors; Task 1's 6 tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add src/services/jobService.ts
git commit -m "feat: add JSearch source and merge/dedup to searchJobs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: SearchPage UI — key settings, badges, link-out row, empty state

**Files:**
- Modify: `src/components/SearchPage.tsx`
- Modify: `src/App.css` (append new rules)

**Interfaces:**
- Consumes: `searchJobs`, `getJSearchKey`, `setJSearchKey` from `../services/jobService`; `Job` from `../services/jobUtils`.
- Produces: final UI; nothing downstream.

- [ ] **Step 1: Replace the contents of `src/components/SearchPage.tsx`**

```tsx
import React, { useState } from 'react';
import { searchJobs, getJSearchKey, setJSearchKey } from '../services/jobService';
import { Job } from '../services/jobUtils';

const JOB_BOARDS = [
  { name: 'LinkedIn', url: (title: string, city: string) => `https://www.linkedin.com/jobs/search/?keywords=${title}&location=${city}` },
  { name: 'Indeed', url: (title: string, city: string) => `https://www.indeed.com/jobs?q=${title}&l=${city}` },
  { name: 'Glassdoor', url: (title: string, city: string) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${title}&locKeyword=${city}` },
  { name: 'Monster', url: (title: string, city: string) => `https://www.monster.com/jobs/search/?q=${title}&where=${city}` },
  { name: 'ZipRecruiter', url: (title: string, city: string) => `https://www.ziprecruiter.com/jobs-search?search=${title}&location=${city}` },
];

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<'any' | '24hrs' | 'week'>('any');
  const [jobLinks, setJobLinks] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(getJSearchKey());

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const links = await searchJobs(jobTitle, city, dateFilter);
      setJobLinks(links);
      setHasSearched(true);
    } catch (err) {
      console.error('Job search failed:', err);
      setJobLinks([]);
      setHasSearched(true);
      setError('Search failed — please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setJSearchKey(value);
  };

  return (
    <div className="search-container">
      <h2>🚀 Job Search</h2>
      <div className="input-group">
        <div className="input-wrapper">
          <span className="input-icon">💼</span>
          <input
            type="text"
            placeholder="e.g. Software Engineer, Designer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-with-icon"
          />
        </div>
        <div className="input-wrapper">
          <span className="input-icon">📍</span>
          <input
            type="text"
            placeholder="e.g. New York, Remote"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-with-icon"
          />
        </div>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as 'any' | '24hrs' | 'week')}>
          <option value="any">📅 Any Time</option>
          <option value="24hrs">🕐 Last 24 Hours</option>
          <option value="week">📆 Last Week</option>
        </select>
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Searching...
            </>
          ) : (
            <>
              🔍 Search Jobs
            </>
          )}
        </button>
      </div>

      <div className="settings-row">
        <button type="button" className="settings-toggle" onClick={() => setShowSettings(!showSettings)}>
          ⚙ API key
        </button>
        {!apiKey && (
          <span className="settings-hint">Add a free RapidAPI key to include LinkedIn/Indeed/Glassdoor results.</span>
        )}
      </div>
      {showSettings && (
        <div className="settings-panel">
          <input
            type="password"
            placeholder="Paste your RapidAPI (JSearch) key"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="api-key-input"
          />
        </div>
      )}

      {error && <p className="search-error">{error}</p>}

      {jobLinks.length > 0 && (
        <div className="results-container">
          <h3>Found {jobLinks.length} Opportunities</h3>
          <div className="job-grid">
            {jobLinks.map((job, index) => (
              <a
                key={index}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="job-link"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="job-header">
                  <h4 className="job-title">{job.title}</h4>
                  <span className="job-arrow">→</span>
                </div>
                <p className="job-company">
                  <span className="company-icon">🏢</span>
                  {job.company}
                  <span className="job-source">{job.source}</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !error && jobLinks.length === 0 && <p className="no-results">No jobs found.</p>}

      {hasSearched && (
        <div className="board-links">
          <span>Search directly on:</span>
          {JOB_BOARDS.map((board) => (
            <a
              key={board.name}
              href={board.url(encodeURIComponent(jobTitle), encodeURIComponent(city))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {board.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
```

- [ ] **Step 2: Append CSS rules to `src/App.css`**

```css
.settings-row {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.settings-toggle {
  background: none;
  border: none;
  box-shadow: none;
  color: #666;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.settings-toggle:hover {
  color: #dc2626;
  transform: none;
  box-shadow: none;
}

.settings-hint {
  font-size: 0.8rem;
  color: #666;
}

.settings-panel {
  margin-top: 0.5rem;
}

.api-key-input {
  width: 100%;
  max-width: 420px;
  font-size: 0.9rem;
}

.job-source {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
}

.no-results {
  margin-top: 1.5rem;
  color: #666;
  font-weight: 600;
}

.board-links {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #666;
}

.board-links a {
  color: #dc2626;
  font-weight: 600;
  text-decoration: none;
}

.board-links a:hover {
  text-decoration: underline;
}
```

Note: `.job-company` is an existing flex-like paragraph; if the badge doesn't right-align, add `display: flex; align-items: center; gap: 0.4rem;` to the existing `.job-company` rule rather than a new wrapper.

- [ ] **Step 3: Verify compile, tests, and build**

Run: `npx react-scripts test --watchAll=false` then `npm run build`
Expected: 6 tests PASS; build compiles with no errors.

- [ ] **Step 4: Manual smoke check**

Run `npm start`, search for "software engineer" in "chicago":
- Adzuna results render with an "Adzuna" badge.
- With no key: hint line visible, no JSearch request in the network tab.
- Paste a key via ⚙ API key: subsequent search fires `jsearch.p.rapidapi.com` request; big-board badges appear.
- "Search directly on:" row renders 5 links below results and the count excludes them.

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchPage.tsx src/App.css
git commit -m "feat: API key settings, source badges, board link-out row

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification

**Files:** none new.

- [ ] **Step 1: Full test + build**

Run: `npx react-scripts test --watchAll=false` and `npm run build`
Expected: all tests PASS, clean production build.

- [ ] **Step 2: Push branch and open PR**

```bash
git push -u origin feature/multi-source-jobs
gh pr create --title "Multi-source job search: JSearch + Adzuna with merged results" --body "Implements docs/superpowers/specs/2026-08-01-multi-source-jobs-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Owner merges and runs `npm run deploy` afterward (or asks Claude to, as with PR #4).
