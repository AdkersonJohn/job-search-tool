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
