import React, { useEffect, useState } from 'react';
import { Briefcase, Building2, Calendar, Check, ClipboardList, Eye, EyeOff, MapPin, Plus, Rocket, Search, Settings, X } from 'lucide-react';
import { searchJobs, getJSearchKey, setJSearchKey } from '../services/jobService';
import { Job, toggleQueued, isApplied } from '../services/jobUtils';

const JOB_BOARDS = [
  { name: 'LinkedIn', url: (title: string, city: string) => `https://www.linkedin.com/jobs/search/?keywords=${title}&location=${city}` },
  { name: 'Indeed', url: (title: string, city: string) => `https://www.indeed.com/jobs?q=${title}&l=${city}` },
  { name: 'Glassdoor', url: (title: string, city: string) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${title}&locKeyword=${city}` },
  { name: 'Monster', url: (title: string, city: string) => `https://www.monster.com/jobs/search/?q=${title}&where=${city}` },
  { name: 'ZipRecruiter', url: (title: string, city: string) => `https://www.ziprecruiter.com/jobs-search?search=${title}&location=${city}` },
];

const APPLY_QUEUE_STORAGE = 'apply_queue';
const APPLIED_JOBS_STORAGE = 'applied_jobs';

const loadJobList = (storageKey: string): Job[] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  } catch {
    return [];
  }
};

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<'any' | '24hrs' | 'week'>('any');
  const [jobLinks, setJobLinks] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceWarning, setSourceWarning] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draftKey, setDraftKey] = useState(getJSearchKey());
  const [storedKey, setStoredKey] = useState(getJSearchKey());
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [queue, setQueue] = useState<Job[]>(() => loadJobList(APPLY_QUEUE_STORAGE));
  const [appliedJobs] = useState<Job[]>(() => loadJobList(APPLIED_JOBS_STORAGE));

  useEffect(() => {
    localStorage.setItem(APPLY_QUEUE_STORAGE, JSON.stringify(queue));
  }, [queue]);

  const isQueued = (job: Job) => queue.some((q) => q.url === job.url);

  const handleToggleQueue = (e: React.MouseEvent, job: Job) => {
    e.preventDefault();
    e.stopPropagation();
    setQueue((prev) => toggleQueued(prev, job));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    setSourceWarning('');
    try {
      const { jobs, failedSources } = await searchJobs(jobTitle, city, dateFilter);
      setJobLinks(jobs);
      setHasSearched(true);
      if (failedSources.length > 0) {
        setSourceWarning(`Some sources failed: ${failedSources.join(', ')} — showing partial results.`);
      }
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

  const handleSaveKey = () => {
    const trimmed = draftKey.trim();
    setJSearchKey(trimmed);
    setStoredKey(trimmed);
    setDraftKey(trimmed);
    setKeySaved(true);
  };

  return (
    <div className="search-container">
      <h2><Rocket size={36} strokeWidth={2.5} /> Job Search</h2>
      <div className="input-group">
        <div className="input-wrapper">
          <span className="input-icon"><Briefcase size={20} /></span>
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
          <span className="input-icon"><MapPin size={20} /></span>
          <input
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
          <select className="input-with-icon" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as 'any' | '24hrs' | 'week')}>
            <option value="any">Any Time</option>
            <option value="24hrs">Last 24 Hours</option>
            <option value="week">Last Week</option>
          </select>
        </div>
        <button onClick={handleSearch} disabled={isLoading}>
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
        <button type="button" className="settings-toggle" aria-expanded={showSettings} onClick={() => setShowSettings(!showSettings)}>
          <Settings size={14} /> API key
        </button>
        {!storedKey && (
          <span className="settings-hint">Add a free RapidAPI key to include LinkedIn/Indeed/Glassdoor results.</span>
        )}
      </div>
      {showSettings && (
        <div className="settings-panel">
          <div className="api-key-field">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Paste your RapidAPI (JSearch) key"
              value={draftKey}
              onChange={(e) => { setDraftKey(e.target.value); setKeySaved(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
              className="api-key-input"
              aria-label="RapidAPI JSearch key"
            />
            <button
              type="button"
              className="key-visibility-toggle"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="api-key-actions">
            <button type="button" className="save-key-button" onClick={handleSaveKey}>
              Save API key
            </button>
            {keySaved && <span className="key-saved"><Check size={16} /> Saved</span>}
          </div>
        </div>
      )}

      {error && <p className="search-error">{error}</p>}
      {sourceWarning && <p className="search-error">{sourceWarning}</p>}

      {jobLinks.length > 0 && (
        <div className="results-container">
          <h3><Briefcase size={24} className="results-icon" /> Found {jobLinks.length} Opportunities</h3>
          <div className="job-grid">
            {jobLinks.map((job, index) => (
              <a
                key={index}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`job-link${isApplied(appliedJobs, job) ? ' applied' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="job-header">
                  <h4 className="job-title">{job.title}</h4>
                  <button
                    type="button"
                    className={`queue-toggle${isQueued(job) ? ' queued' : ''}`}
                    aria-label={isQueued(job) ? 'Remove from apply queue' : 'Add to apply queue'}
                    onClick={(e) => handleToggleQueue(e, job)}
                  >
                    {isQueued(job) ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                  <span className="job-arrow">→</span>
                </div>
                <p className="job-company">
                  <span className="company-icon"><Building2 size={16} /></span>
                  {job.company}
                  {isApplied(appliedJobs, job) && (
                    <span className="applied-badge"><Check size={12} /> Already applied</span>
                  )}
                  <span className="job-source">{job.source}</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !error && jobLinks.length === 0 && <p className="no-results">No jobs found.</p>}

      {queue.length > 0 && (
        <div className="queue-container">
          <h3><ClipboardList size={22} className="results-icon" /> Queued ({queue.length})</h3>
          {queue.map((job) => (
            <div key={job.url} className="queue-row">
              <span className="queue-job">{job.title} — {job.company}</span>
              <span className="job-source">{job.source}</span>
              <button
                type="button"
                className="queue-remove"
                aria-label={`Remove ${job.title} from queue`}
                onClick={() => setQueue((prev) => prev.filter((q) => q.url !== job.url))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="queue-clear" onClick={() => setQueue([])}>
            Clear queue
          </button>
        </div>
      )}

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
