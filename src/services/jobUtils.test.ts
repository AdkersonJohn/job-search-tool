import {
  addApplied,
  dedupeJobs,
  partialFailureMessage,
  totalFailureMessage,
  formatPosted,
  formatSalary,
  canonicalUrl,
  isApplied,
  mapAdzunaJobs,
  mapJSearchJobs,
  toggleQueued,
  Job,
} from './jobUtils';

const job = (title: string, company: string, source = 'Adzuna', location = ''): Job => ({
  title,
  company,
  url: 'https://example.com/x',
  source,
  location,
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

  it('keeps the same role at the same company in different cities', () => {
    const result = dedupeJobs([
      job('Software Engineer II', 'Kroger', 'Adzuna', 'Cincinnati, OH'),
      job('Software Engineer II', 'Kroger', 'Adzuna', 'Columbus, OH'),
      job('Software Engineer II', 'Kroger', 'Adzuna', 'Nashville, TN'),
    ]);
    expect(result).toHaveLength(3);
  });

  it('returns empty array for empty input', () => {
    expect(dedupeJobs([])).toEqual([]);
  });
});

describe('mapAdzunaJobs', () => {
  it('maps Adzuna fields including location, salary and posted date', () => {
    const result = mapAdzunaJobs([
      {
        title: 'Backend Engineer',
        company: { display_name: 'Acme' },
        redirect_url: 'https://adzuna.com/1',
        location: { display_name: 'Newport, KY' },
        salary_min: 100000,
        salary_max: 130000,
        created: new Date().toISOString(),
      },
    ]);
    expect(result).toEqual([
      {
        title: 'Backend Engineer',
        company: 'Acme',
        url: 'https://adzuna.com/1',
        source: 'Adzuna',
        location: 'Newport, KY',
        salary: '$100,000 – $130,000',
        posted: 'Today',
      },
    ]);
  });

  it('drops entries with no redirect_url and fills company fallback', () => {
    const result = mapAdzunaJobs([
      { title: 'Ghost Job', company: { display_name: 'Acme' } },
      { title: 'Real Job', redirect_url: 'https://adzuna.com/2' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: 'Real Job', company: 'Unknown', url: 'https://adzuna.com/2' });
  });

  it('returns empty array for undefined/null input', () => {
    expect(mapAdzunaJobs(undefined)).toEqual([]);
    expect(mapAdzunaJobs(null)).toEqual([]);
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
        job_city: 'Cincinnati',
        job_state: 'OH',
        job_country: 'US',
      },
    ]);
    expect(result).toEqual([
      {
        title: 'React Developer',
        company: 'Initech',
        url: 'https://linkedin.com/jobs/1',
        source: 'LinkedIn',
        location: 'Cincinnati, OH, US',
        salary: '',
        posted: '',
      },
    ]);
  });

  it('labels remote roles as Remote', () => {
    const result = mapJSearchJobs([
      { job_apply_link: 'https://x.com/1', job_is_remote: true, job_city: 'Austin' },
    ]);
    expect(result[0].location).toBe('Remote');
  });

  it('fills fallbacks for missing fields and drops entries without an apply link', () => {
    const result = mapJSearchJobs([
      { job_apply_link: 'https://indeed.com/jobs/2' },
      { job_title: 'No Link Job', employer_name: 'Acme' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: 'Untitled', company: 'Unknown', source: 'Web' });
  });

  it('returns empty array for undefined/null input', () => {
    expect(mapJSearchJobs(undefined)).toEqual([]);
    expect(mapJSearchJobs(null)).toEqual([]);
  });
});

describe('formatSalary', () => {
  it('formats a range', () => {
    expect(formatSalary(90000, 120000)).toBe('$90,000 – $120,000');
  });

  it('collapses an identical min and max to a single figure', () => {
    expect(formatSalary(100000, 100000)).toBe('$100,000');
  });

  it('handles a single bound', () => {
    expect(formatSalary(null, 85000)).toBe('$85,000');
    expect(formatSalary(85000, null)).toBe('$85,000');
  });

  it('returns empty string when there is no salary', () => {
    expect(formatSalary(null, null)).toBe('');
    expect(formatSalary(undefined, undefined)).toBe('');
  });
});

describe('formatPosted', () => {
  it('describes recent dates relatively', () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    expect(formatPosted(daysAgo(0))).toBe('Today');
    expect(formatPosted(daysAgo(1))).toBe('Yesterday');
    expect(formatPosted(daysAgo(5))).toBe('5d ago');
  });

  it('returns empty string for missing or unparseable input', () => {
    expect(formatPosted(undefined)).toBe('');
    expect(formatPosted('')).toBe('');
    expect(formatPosted('not a date')).toBe('');
  });
});

describe('isApplied', () => {
  it('matches by exact url', () => {
    const applied = [job('Old Title', 'Old Co')];
    expect(isApplied(applied, { ...job('Different', 'Other'), url: 'https://example.com/x' })).toBe(true);
  });

  it('matches by title|company|location ignoring case and url differences', () => {
    const applied = [{ ...job('Data Engineer III', 'BC Forward', 'Adzuna', 'Cincinnati, OH'), url: 'https://monster.com/1' }];
    const other = { ...job('  data engineer iii ', 'bc forward', 'LinkedIn', '  CINCINNATI, oh '), url: 'https://linkedin.com/2' };
    expect(isApplied(applied, other)).toBe(true);
  });

  it('does not match the same role at the same company in another city', () => {
    const applied = [job('Software Engineer', 'Amazon', 'Adzuna', 'Seattle, WA')];
    const other = { ...job('Software Engineer', 'Amazon', 'Adzuna', 'Arlington, VA'), url: 'https://amazon.com/2' };
    expect(isApplied(applied, other)).toBe(false);
  });

  it('does not treat two url-less jobs as the same job', () => {
    const applied = [{ ...job('Engineer', 'Acme'), url: '' }];
    const other = { ...job('Designer', 'Globex'), url: '' };
    expect(isApplied(applied, other)).toBe(false);
  });

  it('does not match different jobs', () => {
    expect(isApplied([job('Engineer', 'Acme')], { ...job('Designer', 'Globex'), url: 'https://example.com/y' })).toBe(false);
  });

  // Adzuna stamps the caller's app_id into utm_source, so the same posting produces a
  // different url string after a key rotation.
  it('matches the same posting across a key rotation and tracking params', () => {
    const applied: Job = {
      title: 'Software Development Engineer',
      company: 'Luma Financial Technologies',
      url: 'https://www.adzuna.com/details/5823718996?utm_medium=api&utm_source=085d8a01',
      source: 'Adzuna',
    };
    const fresh: Job = {
      ...applied,
      url: 'https://www.adzuna.com/details/5823718996?utm_medium=api&utm_source=NEWKEY99&v=abc',
      location: 'Cincinnati, Hamilton County',
    };
    expect(isApplied([applied], fresh)).toBe(true);
  });

  it('still separates cities when both records know their location', () => {
    const seattle = { ...job('Software Engineer', 'Amazon', 'Adzuna', 'Seattle, WA'), url: 'https://a.test/1' };
    const arlington = { ...job('Software Engineer', 'Amazon', 'Adzuna', 'Arlington, VA'), url: 'https://a.test/2' };
    expect(isApplied([seattle], arlington)).toBe(false);
  });

  // Tightened deliberately: a location-less record used to match that title+company in
  // ANY city, which silently hid postings that were never applied to.
  it('refuses to badge a different city when the stored record has no location', () => {
    const legacy: Job = {
      title: 'Software Engineer',
      company: 'Amazon',
      url: 'https://amazon.jobs/en/jobs/111',
      source: 'Adzuna',
    };
    const fresh: Job = {
      title: 'Software Engineer',
      company: 'Amazon',
      url: 'https://www.adzuna.com/details/999',
      source: 'Adzuna',
      location: 'Arlington, VA',
    };
    expect(isApplied([legacy], fresh)).toBe(false);
  });

  it('does not match when only one side knows its location', () => {
    const stored = { ...job('Engineer', 'Acme', 'Adzuna', 'Cincinnati, OH'), url: 'https://x.test/1' };
    const fresh = { ...job('Engineer', 'Acme', 'Adzuna', ''), url: 'https://x.test/2' };
    expect(isApplied([stored], fresh)).toBe(false);
  });

  // Two older records hold a free-text note where a url should be.
  it('never matches on an unparseable stored url', () => {
    const noteRecord: Job = { title: 'X', company: 'Y', url: 'adzuna ids 5821918865, 5822940071', source: 'Adzuna' };
    const other: Job = { title: 'Z', company: 'W', url: 'adzuna ids 5825208652', source: 'Adzuna' };
    expect(isApplied([noteRecord], other)).toBe(false);
  });
});

describe('canonicalUrl', () => {
  it('drops the query string, fragment and trailing slash', () => {
    expect(canonicalUrl('https://boards.greenhouse.io/acme/jobs/123?token=abc#apply')).toBe('boards.greenhouse.io/acme/jobs/123');
    expect(canonicalUrl('https://Boards.Greenhouse.IO/acme/jobs/123/')).toBe('boards.greenhouse.io/acme/jobs/123');
  });

  it('returns empty string for missing or unparseable input', () => {
    expect(canonicalUrl(undefined)).toBe('');
    expect(canonicalUrl('')).toBe('');
    expect(canonicalUrl('adzuna ids 5821918865, 5822940071')).toBe('');
  });

  it('keeps genuinely different postings apart', () => {
    expect(canonicalUrl('https://www.adzuna.com/details/111')).not.toBe(canonicalUrl('https://www.adzuna.com/details/222'));
    expect(canonicalUrl('https://www.adzuna.com/land/ad/111')).not.toBe(canonicalUrl('https://www.adzuna.com/land/ad/222'));
  });

  // Adzuna serves the same ad under both routes; older records use /details/.
  it('collapses both Adzuna routes onto the ad id', () => {
    const details = canonicalUrl('https://www.adzuna.com/details/5823718996?utm_source=OLD');
    const land = canonicalUrl('https://www.adzuna.com/land/ad/5823718996?utm_source=NEW&v=1');
    expect(details).toBe('adzuna:5823718996');
    expect(land).toBe(details);
  });

  it('does not confuse another host that has a numeric path', () => {
    expect(canonicalUrl('https://jobs.example.com/details/5823718996')).toBe('jobs.example.com/details/5823718996');
  });
});

describe('addApplied', () => {
  it('appends a job that is not already applied to', () => {
    const result = addApplied([job('Engineer', 'Acme')], { ...job('Designer', 'Globex'), url: 'https://example.com/y' });
    expect(result).toHaveLength(2);
  });

  it('is idempotent for a job already applied to', () => {
    const existing = job('Engineer', 'Acme');
    expect(addApplied([existing], { ...existing })).toHaveLength(1);
  });
});

describe('failure messages', () => {
  it('names each failed source and why in the partial banner', () => {
    expect(partialFailureMessage([{ name: 'JSearch', kind: 'unavailable' }])).toBe(
      'JSearch is temporarily unavailable — showing partial results.',
    );
  });

  it('joins multiple failed sources', () => {
    const msg = partialFailureMessage([
      { name: 'Adzuna', kind: 'rateLimit' },
      { name: 'JSearch', kind: 'auth' },
    ]);
    expect(msg).toBe('Adzuna hit its request limit; JSearch rejected the API key — showing partial results.');
  });

  it('does not blame the key for a provider outage', () => {
    const msg = totalFailureMessage([{ name: 'JSearch', kind: 'unavailable' }]);
    expect(msg).toMatch(/their end/i);
    expect(msg).not.toMatch(/api key/i);
  });

  it('does blame the key when the provider rejected it', () => {
    expect(totalFailureMessage([{ name: 'Adzuna', kind: 'auth' }])).toMatch(/api key was rejected/i);
  });

  it('falls back to the generic message when causes differ', () => {
    const msg = totalFailureMessage([
      { name: 'Adzuna', kind: 'auth' },
      { name: 'JSearch', kind: 'unavailable' },
    ]);
    expect(msg).toMatch(/check your connection/i);
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
