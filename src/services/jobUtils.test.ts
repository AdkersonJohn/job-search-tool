import { dedupeJobs, mapJSearchJobs, toggleQueued, isApplied, Job } from './jobUtils';

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

describe('isApplied', () => {
  it('matches by exact url', () => {
    const applied = [job('Old Title', 'Old Co')];
    expect(isApplied(applied, { ...job('Different', 'Other'), url: 'https://example.com/x' })).toBe(true);
  });

  it('matches by title|company ignoring case and url differences', () => {
    const applied = [{ ...job('Data Engineer III', 'BC Forward'), url: 'https://monster.com/1' }];
    expect(isApplied(applied, { ...job('  data engineer iii ', 'bc forward', 'LinkedIn'), url: 'https://linkedin.com/2' })).toBe(true);
  });

  it('does not match different jobs', () => {
    expect(isApplied([job('Engineer', 'Acme')], { ...job('Designer', 'Globex'), url: 'https://example.com/y' })).toBe(false);
  });
});

describe('toggleQueued', () => {
  it('adds a job not in the queue', () => {
    const result = toggleQueued([job('Engineer', 'Acme')], { ...job('Designer', 'Globex'), url: 'https://example.com/y' });
    expect(result).toHaveLength(2);
  });

  it('removes a job already in the queue, matching by url', () => {
    const queued = job('Engineer', 'Acme');
    expect(toggleQueued([queued], { ...queued, title: 'Renamed' })).toEqual([]);
  });
});
