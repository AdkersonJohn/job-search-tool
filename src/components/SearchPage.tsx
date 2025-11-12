import React, { useState } from 'react';
import { searchJobs } from '../services/jobService';

const SearchPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState<'any' | '24hrs' | 'week'>('any');
  const [jobLinks, setJobLinks] = useState<{ title: string; company: string; url: string }[]>([]);

  const handleSearch = async () => {
    const links = await searchJobs(jobTitle, city, dateFilter);
    setJobLinks(links);
  };

  return (
    <div className="search-container">
      <h2>Job Search</h2>
      <input
        type="text"
        placeholder="Job Title"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
      />
      <input
        type="text"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as 'any' | '24hrs' | 'week')}>
        <option value="any">Any Time</option>
        <option value="24hrs">Last 24 Hours</option>
        <option value="week">Last Week</option>
      </select>
      <button onClick={handleSearch}>Search</button>

      {jobLinks.length > 0 && (
        <div className="results-container">
          <h3>Job Listings</h3>
          {jobLinks.map((job, index) => (
            <a key={index} href={job.url} target="_blank" rel="noopener noreferrer" className="job-link">
              {job.title} - {job.company}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
