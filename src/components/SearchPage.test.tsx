import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './SearchPage';
import { searchJobs, hasConfiguredSource, getAdzunaCredentials, getJSearchKey, NO_SOURCES_ERROR } from '../services/jobService';
import { Job } from '../services/jobUtils';

// Mocked wholesale rather than with requireActual: the real module imports axios,
// which ships ESM that CRA's Jest transform does not process.
jest.mock('../services/jobService', () => ({
  NO_SOURCES_ERROR: 'No job sources configured',
  searchJobs: jest.fn(),
  hasConfiguredSource: jest.fn(),
  getJSearchKey: jest.fn(() => ''),
  setJSearchKey: jest.fn(),
  getAdzunaCredentials: jest.fn(() => ({ appId: '', appKey: '' })),
  setAdzunaCredentials: jest.fn(),
}));

const mockedSearch = searchJobs as jest.MockedFunction<typeof searchJobs>;
const mockedHasSource = hasConfiguredSource as jest.MockedFunction<typeof hasConfiguredSource>;

const job = (overrides: Partial<Job> = {}): Job => ({
  title: 'Senior Software Engineer',
  company: 'Acme',
  url: 'https://example.com/job/1',
  source: 'Adzuna',
  location: 'Newport, KY',
  ...overrides,
});

const runSearch = async () => {
  await userEvent.type(screen.getByLabelText('Job title'), 'engineer');
  await userEvent.click(screen.getByRole('button', { name: /search jobs/i }));
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedHasSource.mockReturnValue(true);
  // clearAllMocks drops factory implementations too, so restore the getters.
  (getAdzunaCredentials as jest.Mock).mockReturnValue({ appId: '', appKey: '' });
  (getJSearchKey as jest.Mock).mockReturnValue('');
  mockedSearch.mockResolvedValue({ jobs: [job()], failedSources: [] });
});

describe('accessible names', () => {
  it('exposes the job link and the queue button as separate controls', async () => {
    render(<SearchPage />);
    await runSearch();

    // Regression guard: the queue button must not be nested inside the link, or its
    // label gets absorbed into the link's accessible name.
    const link = await screen.findByRole('link', { name: 'Senior Software Engineer' });
    expect(link).toHaveAttribute('href', 'https://example.com/job/1');
    expect(screen.getByRole('button', { name: /add senior software engineer to apply queue/i })).toBeInTheDocument();
  });
});

describe('apply queue', () => {
  it('queues a job without navigating and persists it', async () => {
    render(<SearchPage />);
    await runSearch();

    await userEvent.click(await screen.findByRole('button', { name: /add senior software engineer to apply queue/i }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('apply_queue') ?? '[]')).toHaveLength(1);
    });
    expect(screen.getByRole('heading', { name: /queued \(1\)/i })).toBeInTheDocument();
  });

  it('does not clobber queue entries written by the apply-queue automation', async () => {
    render(<SearchPage />);
    await runSearch();

    // Automation removes an applied job from storage while this tab is open.
    localStorage.setItem('apply_queue', JSON.stringify([job({ url: 'https://example.com/job/9', title: 'Agent Queued' })]));

    await userEvent.click(await screen.findByRole('button', { name: /add senior software engineer to apply queue/i }));

    const stored = JSON.parse(localStorage.getItem('apply_queue') ?? '[]');
    expect(stored.map((j: Job) => j.url)).toEqual(['https://example.com/job/9', 'https://example.com/job/1']);
  });
});

describe('applied tracking', () => {
  it('marks a job applied from the UI and writes applied_jobs', async () => {
    render(<SearchPage />);
    await runSearch();

    await userEvent.click(await screen.findByRole('button', { name: /mark senior software engineer as applied/i }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('applied_jobs') ?? '[]')).toHaveLength(1);
    });
    expect(screen.getByText(/already applied/i)).toBeInTheDocument();
  });

  it('badges a previously applied job read from localStorage on mount', async () => {
    localStorage.setItem('applied_jobs', JSON.stringify([job()]));
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByText(/already applied/i)).toBeInTheDocument();
  });

  it('ignores a non-array value in localStorage instead of crashing', async () => {
    localStorage.setItem('apply_queue', '{"not":"an array"}');
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByRole('link', { name: 'Senior Software Engineer' })).toBeInTheDocument();
  });
});

describe('search states', () => {
  it('shows a loading state while the search is in flight', async () => {
    mockedSearch.mockReturnValue(new Promise(() => {}));
    render(<SearchPage />);
    await runSearch();

    const button = screen.getByRole('button', { name: /searching/i });
    expect(button).toBeDisabled();
  });

  it('reports when nothing was found', async () => {
    mockedSearch.mockResolvedValue({ jobs: [], failedSources: [] });
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByText('No jobs found.')).toBeInTheDocument();
  });

  it('shows an error and no results when every source fails', async () => {
    mockedSearch.mockRejectedValue(new Error('All job sources failed'));
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByText(/search failed/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Senior Software Engineer' })).not.toBeInTheDocument();
  });

  it('shows partial results alongside a warning when one source fails', async () => {
    mockedSearch.mockResolvedValue({ jobs: [job()], failedSources: ['JSearch (LinkedIn/Indeed/Glassdoor)'] });
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByText(/some sources failed: jsearch/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Senior Software Engineer' })).toBeInTheDocument();
  });

  it('prompts for setup when no API key is configured', async () => {
    mockedSearch.mockRejectedValue(new Error(NO_SOURCES_ERROR));
    render(<SearchPage />);
    await runSearch();

    expect(await screen.findByText(/add an api key below/i)).toBeInTheDocument();
  });

  it('refuses to search with both fields empty', async () => {
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: /search jobs/i }));

    expect(await screen.findByText(/enter a job title or a location/i)).toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
