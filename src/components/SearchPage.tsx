import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, Calendar, Check, DollarSign, ExternalLink, Eye, EyeOff, MapPin, Plus, Rocket, Search, Settings, X } from 'lucide-react';
import {
  DateFilter,
  NO_SOURCES_ERROR,
  getAdzunaCredentials,
  getJSearchKey,
  hasConfiguredSource,
  searchJobs,
  setAdzunaCredentials,
  setJSearchKey,
} from '../services/jobService';
import {
  AllSourcesFailedError,
  Job,
  addApplied,
  isApplied,
  partialFailureMessage,
  toggleQueued,
  totalFailureMessage,
} from '../services/jobUtils';

const JOB_BOARDS = [
  { name: 'LinkedIn', url: (title: string, city: string) => `https://www.linkedin.com/jobs/search/?keywords=${title}&location=${city}` },
  { name: 'Indeed', url: (title: string, city: string) => `https://www.indeed.com/jobs?q=${title}&l=${city}` },
  { name: 'Glassdoor', url: (title: string, city: string) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${title}&locKeyword=${city}` },
  { name: 'Monster', url: (title: string, city: string) => `https://www.monster.com/jobs/search/?q=${title}&where=${city}` },
  { name: 'ZipRecruiter', url: (title: string, city: string) => `https://www.ziprecruiter.com/jobs-search?search=${title}&location=${city}` },
];

const APPLY_QUEUE_STORAGE = 'apply_queue';
const APPLIED_JOBS_STORAGE = 'applied_jobs';
const MAX_STAGGER_STEPS = 10;

const loadJobList = (storageKey: string): Job[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveJobList = (storageKey: string, jobs: Job[]): void => {
  localStorage.setItem(storageKey, JSON.stringify(jobs));
};

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [searchedFor, setSearchedFor] = useState({ jobTitle: '', city: '' });
  const [jobLinks, setJobLinks] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceWarning, setSourceWarning] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(!hasConfiguredSource());
  const [draftKey, setDraftKey] = useState(getJSearchKey());
  const [storedKey, setStoredKey] = useState(getJSearchKey());
  const [draftAdzuna, setDraftAdzuna] = useState(getAdzunaCredentials());
  const [hasSource, setHasSource] = useState(hasConfiguredSource());
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [queue, setQueue] = useState<Job[]>(() => loadJobList(APPLY_QUEUE_STORAGE));
  const [appliedJobs, setAppliedJobs] = useState<Job[]>(() => loadJobList(APPLIED_JOBS_STORAGE));

  // Both lists can also be written by the apply-queue automation in another tab or
  // in this one. Re-read on storage events and on focus so our in-memory copy never
  // overwrites those edits.
  const reloadLists = useCallback(() => {
    setQueue(loadJobList(APPLY_QUEUE_STORAGE));
    setAppliedJobs(loadJobList(APPLIED_JOBS_STORAGE));
  }, []);

  useEffect(() => {
    window.addEventListener('storage', reloadLists);
    window.addEventListener('focus', reloadLists);
    return () => {
      window.removeEventListener('storage', reloadLists);
      window.removeEventListener('focus', reloadLists);
    };
  }, [reloadLists]);

  const isQueued = (job: Job) => queue.some((q) => q.url === job.url);

  const updateQueue = (next: (current: Job[]) => Job[]) => {
    const updated = next(loadJobList(APPLY_QUEUE_STORAGE));
    saveJobList(APPLY_QUEUE_STORAGE, updated);
    setQueue(updated);
  };

  const handleToggleQueue = (job: Job) => updateQueue((current) => toggleQueued(current, job));

  const handleMarkApplied = (job: Job) => {
    const updated = addApplied(loadJobList(APPLIED_JOBS_STORAGE), job);
    saveJobList(APPLIED_JOBS_STORAGE, updated);
    setAppliedJobs(updated);
    updateQueue((current) => current.filter((q) => q.url !== job.url));
  };

  const handleSearch = async () => {
    if (!jobTitle.trim() && !city.trim()) {
      setError('Enter a job title or a location to search.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSourceWarning('');
    setJobLinks([]);
    try {
      const { jobs, failedSources } = await searchJobs(jobTitle, city, dateFilter);
      setJobLinks(jobs);
      setSearchedFor({ jobTitle, city });
      setHasSearched(true);
      if (failedSources.length > 0) {
        setSourceWarning(partialFailureMessage(failedSources));
      }
    } catch (err) {
      console.error('Job search failed:', err);
      setHasSearched(true);
      if (err instanceof Error && err.message === NO_SOURCES_ERROR) {
        setError('Add an API key below to start searching.');
        setShowSettings(true);
      } else if (err instanceof AllSourcesFailedError) {
        setError(totalFailureMessage(err.failures));
      } else {
        setError('Search failed. Check your connection, and confirm your API keys are still valid.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSaveKey = () => {
    const trimmed = draftKey.trim();
    setJSearchKey(trimmed);
    setStoredKey(trimmed);
    setDraftKey(trimmed);
    setAdzunaCredentials(draftAdzuna);
    setDraftAdzuna(getAdzunaCredentials());
    setHasSource(hasConfiguredSource());
    setKeySaved(true);
  };

  return (
    <>
      <header className="global-nav">
        <div className="global-nav-inner">
          <span className="nav-wordmark"><Rocket size={16} strokeWidth={2.2} /> Job Search</span>
          <span className="nav-spacer" />
          {queue.length > 0 && (
            <a className="nav-link" href="#queue">
              Queue <span className="nav-count">{queue.length}</span>
            </a>
          )}
        </div>
      </header>
      <main className="search-container">
      <section className="hero">
        <h1>Find your next role.</h1>
        <p className="hero-sub">
          Search every source at once. Queue what matters. Never apply to the same job twice.
        </p>
      </section>
      <div className="search-panel">
      <div className="input-group">
        <div className="input-wrapper">
          <span className="input-icon"><Briefcase size={20} /></span>
          <label className="visually-hidden" htmlFor="job-title">Job title</label>
          <input
            id="job-title"
            type="text"
            placeholder="e.g. Software Engineer, Designer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-with-icon"
          />
        </div>
        <div className="input-wrapper">
          <span className="input-icon"><MapPin size={20} /></span>
          <label className="visually-hidden" htmlFor="job-city">Location</label>
          <input
            id="job-city"
            type="text"
            placeholder="e.g. New York, Remote"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-with-icon"
          />
        </div>
        <div className="input-wrapper">
          <span className="input-icon"><Calendar size={20} /></span>
          <label className="visually-hidden" htmlFor="job-date-filter">Posted within</label>
          <select
            id="job-date-filter"
            className="input-with-icon"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            <option value="any">Any Time</option>
            <option value="24hrs">Last 24 Hours</option>
            <option value="week">Last Week</option>
          </select>
        </div>
        <button onClick={handleSearch} disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Searching...
            </>
          ) : (
            <>
              <Search size={18} /> Search Jobs
            </>
          )}
        </button>
      </div>

      <div className="settings-row">
        <button type="button" className="settings-toggle" aria-expanded={showSettings} aria-controls="api-settings" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={14} /> API keys
        </button>
        {!hasSource && (
          <span className="settings-hint">Add a free Adzuna or RapidAPI key to search. Keys stay in this browser.</span>
        )}
        {hasSource && !storedKey && (
          <span className="settings-hint">Add a free RapidAPI key to also include LinkedIn/Indeed/Glassdoor results.</span>
        )}
      </div>
      {showSettings && (
        <div className="settings-panel" id="api-settings">
          <p className="settings-note">
            Keys are stored only in this browser and are never sent anywhere except the job API they belong to.
          </p>
          <div className="api-key-field">
            <label className="api-key-label" htmlFor="adzuna-app-id">
              Adzuna App ID — <a href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer">get a free key</a>
            </label>
            <input
              id="adzuna-app-id"
              type="text"
              placeholder="Adzuna app_id"
              value={draftAdzuna.appId}
              onChange={(e) => { setDraftAdzuna({ ...draftAdzuna, appId: e.target.value }); setKeySaved(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
              className="api-key-input"
            />
          </div>
          <div className="api-key-field">
            <label className="api-key-label" htmlFor="adzuna-app-key">Adzuna App Key</label>
            <input
              id="adzuna-app-key"
              type={showKey ? 'text' : 'password'}
              placeholder="Adzuna app_key"
              value={draftAdzuna.appKey}
              onChange={(e) => { setDraftAdzuna({ ...draftAdzuna, appKey: e.target.value }); setKeySaved(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
              className="api-key-input"
            />
          </div>
          <div className="api-key-field">
            <label className="api-key-label" htmlFor="jsearch-key">
              RapidAPI JSearch key (optional) — <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" rel="noopener noreferrer">get a free key</a>
            </label>
            <input
              id="jsearch-key"
              type={showKey ? 'text' : 'password'}
              placeholder="Adds LinkedIn/Indeed/Glassdoor results"
              value={draftKey}
              onChange={(e) => { setDraftKey(e.target.value); setKeySaved(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
              className="api-key-input"
            />
            <button
              type="button"
              className="key-visibility-toggle"
              aria-label={showKey ? 'Hide API keys' : 'Show API keys'}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="api-key-actions">
            <button type="button" className="save-key-button" onClick={handleSaveKey}>
              Save keys
            </button>
            {keySaved && <span className="key-saved"><Check size={16} /> Saved</span>}
          </div>
        </div>
      )}
      </div>

      <div aria-live="polite" role="status">
        {error && <p className="search-error">{error}</p>}
        {sourceWarning && <p className="search-warning">{sourceWarning}</p>}
        {hasSearched && !error && jobLinks.length === 0 && !isLoading && <p className="no-results">No jobs found.</p>}
        {jobLinks.length > 0 && <p className="visually-hidden">Found {jobLinks.length} jobs.</p>}
      </div>

      {jobLinks.length > 0 && (
        <section className="results-container">
          <h2>Found {jobLinks.length} opportunities</h2>
          <div className="job-grid">
            {jobLinks.map((job, index) => {
              const applied = isApplied(appliedJobs, job);
              return (
                <div
                  key={job.url}
                  className={`job-card${applied ? ' applied' : ''}`}
                  style={{ animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * 0.05}s` }}
                >
                  <div className="job-header">
                    <h3 className="job-title">
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-title-link">
                        {job.title}
                        <ExternalLink size={14} className="job-external-icon" aria-hidden="true" />
                      </a>
                    </h3>
                    <div className="job-actions">
                      <button
                        type="button"
                        className={`queue-toggle${isQueued(job) ? ' queued' : ''}`}
                        aria-label={isQueued(job) ? `Remove ${job.title} from apply queue` : `Add ${job.title} to apply queue`}
                        aria-pressed={isQueued(job)}
                        onClick={() => handleToggleQueue(job)}
                      >
                        {isQueued(job) ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                      <button
                        type="button"
                        className={`applied-toggle${applied ? ' is-applied' : ''}`}
                        aria-label={applied ? `${job.title} is marked applied` : `Mark ${job.title} as applied`}
                        aria-pressed={applied}
                        disabled={applied}
                        onClick={() => handleMarkApplied(job)}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="job-company">
                    <span className="company-icon"><Building2 size={16} /></span>
                    {job.company}
                    <span className="job-source">{job.source}</span>
                  </p>
                  <p className="job-meta">
                    {job.location && <span className="job-meta-item"><MapPin size={14} /> {job.location}</span>}
                    {job.salary && <span className="job-meta-item"><DollarSign size={14} /> {job.salary}</span>}
                    {job.posted && <span className="job-meta-item"><Calendar size={14} /> {job.posted}</span>}
                    {applied && <span className="applied-badge"><Check size={12} /> Already applied</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {queue.length > 0 && (
        <section className="queue-container" id="queue">
          <h2>Queued ({queue.length})</h2>
          {queue.map((job) => (
            <div key={job.url} className="queue-row">
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="queue-job">
                {job.title} — {job.company}
              </a>
              <span className="job-source">{job.source}</span>
              <button
                type="button"
                className="queue-applied"
                aria-label={`Mark ${job.title} as applied`}
                onClick={() => handleMarkApplied(job)}
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                className="queue-remove"
                aria-label={`Remove ${job.title} from queue`}
                onClick={() => handleToggleQueue(job)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="queue-clear" onClick={() => updateQueue(() => [])}>
            Clear queue
          </button>
        </section>
      )}

      {hasSearched && (
        <div className="board-links">
          <span>Search directly on:</span>
          {JOB_BOARDS.map((board) => (
            <a
              key={board.name}
              href={board.url(encodeURIComponent(searchedFor.jobTitle), encodeURIComponent(searchedFor.city))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {board.name}
            </a>
          ))}
        </div>
      )}
      </main>
    </>
  );
};

export default SearchPage;
