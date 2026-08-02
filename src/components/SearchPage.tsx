import React, { useState } from 'react';
import { searchJobs, getJSearchKey, setJSearchKey } from '../services/jobService';
import { Job } from '../services/jobUtils';

const JOB_BOARDS = [
  { name: 'LinkedIn', url: (title: string, city: string) => `https://www.linkedin.com/jobs/search/?keywords=${title}&location=${city}` },
  { name: 'Indeed', url: (title: string, city: string) => `https://www.indeed.com/jobs?q=${title}&l=${city}` },
  { name: 'Glassdoor', url: (title: string, city: string) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${title}&locKeyword=${city}` },
  { name: 'Monster', url: (title: string, city: string) => `https://www.monster.com/jobs/search/?q=${title}&where=${city}` },
  { name: 'ZipRecruiter', url: (title: string, city: string) => `https://www.ziprecruiter.com/jobs-search?search=${title}&location=${city}` },
];

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<'any' | '24hrs' | 'week'>('any');
  const [jobLinks, setJobLinks] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(getJSearchKey());

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const links = await searchJobs(jobTitle, city, dateFilter);
      setJobLinks(links);
      setHasSearched(true);
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

  const handleApiKeyChange = (value: string) => {
    setApiKey(value.trim());
    setJSearchKey(value);
  };

  return (
    <div className="search-container">
      <h2>🚀 Job Search</h2>
      <div className="input-group">
        <div className="input-wrapper">
          <span className="input-icon">💼</span>
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
          <span className="input-icon">📍</span>
          <input
            type="text"
            placeholder="e.g. New York, Remote"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-with-icon"
          />
        </div>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as 'any' | '24hrs' | 'week')}>
          <option value="any">📅 Any Time</option>
          <option value="24hrs">🕐 Last 24 Hours</option>
          <option value="week">📆 Last Week</option>
        </select>
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Searching...
            </>
          ) : (
            <>
              🔍 Search Jobs
            </>
          )}
        </button>
      </div>

      <div className="settings-row">
        <button type="button" className="settings-toggle" aria-expanded={showSettings} onClick={() => setShowSettings(!showSettings)}>
          ⚙ API key
        </button>
        {!apiKey && (
          <span className="settings-hint">Add a free RapidAPI key to include LinkedIn/Indeed/Glassdoor results.</span>
        )}
      </div>
      {showSettings && (
        <div className="settings-panel">
          <input
            type="password"
            placeholder="Paste your RapidAPI (JSearch) key"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="api-key-input"
            aria-label="RapidAPI JSearch key"
          />
        </div>
      )}

      {error && <p className="search-error">{error}</p>}

      {jobLinks.length > 0 && (
        <div className="results-container">
          <h3>Found {jobLinks.length} Opportunities</h3>
          <div className="job-grid">
            {jobLinks.map((job, index) => (
              <a
                key={index}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="job-link"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="job-header">
                  <h4 className="job-title">{job.title}</h4>
                  <span className="job-arrow">→</span>
                </div>
                <p className="job-company">
                  <span className="company-icon">🏢</span>
                  {job.company}
                  <span className="job-source">{job.source}</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !error && jobLinks.length === 0 && <p className="no-results">No jobs found.</p>}

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
