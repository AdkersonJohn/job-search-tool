export type FailureKind = 'auth' | 'rateLimit' | 'unavailable' | 'network' | 'unknown';
export type SourceFailure = { name: string; kind: FailureKind };

const FAILURE_PHRASE: Record<FailureKind, string> = {
  auth: 'rejected the API key',
  rateLimit: 'hit its request limit',
  unavailable: 'is temporarily unavailable',
  network: 'could not be reached',
  unknown: 'failed unexpectedly',
};

/** Banner shown when some sources returned results and others didn't. */
export const partialFailureMessage = (failures: SourceFailure[]): string =>
  `${failures.map((f) => `${f.name} ${FAILURE_PHRASE[f.kind]}`).join('; ')} — showing partial results.`;

/** Banner shown when nothing came back at all. A provider outage must not be
    reported as a key problem — that sends people to check a key that is fine. */
export const totalFailureMessage = (failures: SourceFailure[]): string => {
  const kinds = new Set(failures.map((f) => f.kind));
  if (kinds.size === 1) {
    const [kind] = Array.from(kinds);
    if (kind === 'auth') return 'Your API key was rejected. Check it under API keys below.';
    if (kind === 'rateLimit') return 'You have hit the request limit for your API key. Try again later.';
    if (kind === 'unavailable') return 'The job source is temporarily unavailable. That is on their end — try again in a few minutes.';
    if (kind === 'network') return 'Could not reach the job sources. Check your connection and try again.';
  }
  return 'Search failed. Check your connection, and confirm your API keys are still valid.';
};

export class AllSourcesFailedError extends Error {
  constructor(public readonly failures: SourceFailure[]) {
    super('All job sources failed');
    this.name = 'AllSourcesFailedError';
  }
}

export type Job = {
  title: string;
  company: string;
  url: string;
  source: string;
  location?: string;
  salary?: string;
  posted?: string;
};

const norm = (value: string | undefined): string => (value ?? '').trim().toLowerCase();

const jobKey = (job: Pick<Job, 'title' | 'company' | 'location'>): string =>
  `${norm(job.title)}|${norm(job.company)}|${norm(job.location)}`;

export const dedupeJobs = (jobs: Job[]): Job[] => {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = jobKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Host + path, lowercased, with the query string dropped. Adzuna stamps the caller's
 * app_id into `utm_source`, so raw url equality breaks the moment the key is rotated
 * even though it is the same posting. Returns '' for anything unparseable — some
 * older records hold a note rather than a url, and those must never match.
 */
export const canonicalUrl = (url: string | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Adzuna routes the same ad as both /details/<id> and /land/ad/<id> — the id is
    // the ad, the path is just where you land. Collapse both onto the id, or the same
    // posting reads as two different jobs depending on when it was recorded.
    const adzunaId = /^(?:www\.)?adzuna\.com$/i.test(parsed.host)
      ? /^\/(?:details|land\/ad)\/(\d+)/.exec(parsed.pathname)
      : null;
    if (adzunaId) return `adzuna:${adzunaId[1]}`;
    return `${parsed.host}${parsed.pathname}`.toLowerCase().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

/**
 * Deliberately strict: a false "Already applied" badge silently hides a job the user
 * could have applied to, which is worse than failing to recognise an old application
 * they can still spot themselves. So a match needs either the same canonical url, or
 * all three of title, company and location present and equal on BOTH sides.
 *
 * A record with no location therefore matches on url alone. Records written before
 * location existed can only be recognised that way, which is the accepted cost of
 * never badging the wrong posting.
 */
const isSameJob = (a: Job, b: Job): boolean => {
  const sameUrl = canonicalUrl(a.url) !== '' && canonicalUrl(a.url) === canonicalUrl(b.url);
  if (sameUrl) return true;
  if (norm(a.title) !== norm(b.title) || norm(a.company) !== norm(b.company)) return false;
  return norm(a.location) !== '' && norm(a.location) === norm(b.location);
};

export const isApplied = (applied: Job[], job: Job): boolean =>
  applied.some((a) => isSameJob(a, job));

export const toggleQueued = (queue: Job[], job: Job): Job[] =>
  queue.some((q) => q.url === job.url) ? queue.filter((q) => q.url !== job.url) : [...queue, job];

export const addApplied = (applied: Job[], job: Job): Job[] =>
  isApplied(applied, job) ? applied : [...applied, job];

const usd = (amount: number): string => `$${Math.round(amount).toLocaleString('en-US')}`;

export const formatSalary = (min?: number | null, max?: number | null): string => {
  if (!min && !max) return '';
  if (min && max && Math.round(min) !== Math.round(max)) return `${usd(min)} – ${usd(max)}`;
  return usd((min || max) as number);
};

export const formatPosted = (isoDate?: string | null): string => {
  if (!isoDate) return '';
  const posted = new Date(isoDate);
  if (Number.isNaN(posted.getTime())) return '';
  const days = Math.floor((Date.now() - posted.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return posted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const mapAdzunaJobs = (results: any[] | undefined | null): Job[] =>
  (results ?? [])
    .map((r: any) => ({
      title: r.title ?? 'Untitled',
      company: r.company?.display_name ?? 'Unknown',
      url: r.redirect_url,
      source: 'Adzuna',
      location: r.location?.display_name ?? '',
      salary: formatSalary(r.salary_min, r.salary_max),
      posted: formatPosted(r.created),
    }))
    .filter((j) => j.url);

const jsearchLocation = (r: any): string =>
  [r.job_city, r.job_state, r.job_country].filter(Boolean).join(', ');

export const mapJSearchJobs = (results: any[] | undefined | null): Job[] =>
  (results ?? [])
    .map((r: any) => ({
      title: r.job_title ?? 'Untitled',
      company: r.employer_name ?? 'Unknown',
      url: r.job_apply_link,
      source: r.job_publisher ?? 'Web',
      location: r.job_is_remote ? 'Remote' : jsearchLocation(r),
      salary: formatSalary(r.job_min_salary, r.job_max_salary),
      posted: formatPosted(r.job_posted_at_datetime_utc),
    }))
    .filter((j) => j.url);
