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

export const isApplied = (applied: Job[], job: Job): boolean =>
  applied.some((a) => (!!a.url && a.url === job.url) || jobKey(a) === jobKey(job));

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
