import React, { useState } from 'react';
import { searchJobs } from '../services/jobService';

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<'any' | '24hrs' | 'week'>('any');
  const [jobLinks, setJobLinks] = useState<{ title: string; company: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const links = await searchJobs(jobTitle, city, dateFilter);
      setJobLinks(links);
    } catch (err) {
      console.error('Job search failed:', err);
      setJobLinks([]);
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
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
