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
