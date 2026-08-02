export type Job = { title: string; company: string; url: string; source: string };

const jobKey = (job: Pick<Job, 'title' | 'company'>): string =>
  `${job.title.trim().toLowerCase()}|${job.company.trim().toLowerCase()}`;

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
  applied.some((a) => a.url === job.url || jobKey(a) === jobKey(job));

export const toggleQueued = (queue: Job[], job: Job): Job[] =>
  queue.some((q) => q.url === job.url) ? queue.filter((q) => q.url !== job.url) : [...queue, job];

export const mapJSearchJobs = (results: any[] | undefined | null): Job[] =>
  (results ?? [])
    .map((r: any) => ({
      title: r.job_title ?? 'Untitled',
      company: r.employer_name ?? 'Unknown',
      url: r.job_apply_link,
      source: r.job_publisher ?? 'Web',
    }))
    .filter((j) => j.url);
