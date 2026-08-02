import axios from 'axios';
import { Job, dedupeJobs, mapJSearchJobs } from './jobUtils';

const ADZUNA_APP_ID = "085d8a01";
const ADZUNA_API_KEY = "8fbd3b9536418b89512a0b9c712a38c6";
const ADZUNA_BASE_URL = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}&results_per_page=50`;

const JSEARCH_KEY_STORAGE = 'jsearch_api_key';

export const getJSearchKey = (): string => localStorage.getItem(JSEARCH_KEY_STORAGE) ?? '';

export const setJSearchKey = (key: string): void => {
  localStorage.setItem(JSEARCH_KEY_STORAGE, key.trim());
};

const fetchAdzuna = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week'): Promise<Job[]> => {
  let adzunaUrl = `${ADZUNA_BASE_URL}&what=${encodeURIComponent(jobTitle)}&where=${encodeURIComponent(city)}`;

  if (dateFilter === '24hrs') {
    adzunaUrl += '&max_days_old=1';
  } else if (dateFilter === 'week') {
    adzunaUrl += '&max_days_old=7';
  }

  const response = await axios.get(adzunaUrl);
  return (response.data.results ?? []).map((job: any) => ({
    title: job.title ?? '',
    company: job.company?.display_name ?? 'Unknown',
    url: job.redirect_url,
    source: 'Adzuna',
  }));
};

const fetchJSearch = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week', key: string): Promise<Job[]> => {
  const datePosted = dateFilter === '24hrs' ? 'today' : dateFilter === 'week' ? 'week' : 'all';
  const response = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
    params: { query: `${jobTitle} in ${city}`, date_posted: datePosted },
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
  });
  return mapJSearchJobs(response.data.data?.jobs);
};

export type SearchResult = { jobs: Job[]; failedSources: string[] };

export const searchJobs = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week'): Promise<SearchResult> => {
  const key = getJSearchKey();
  const sources = [{ name: 'Adzuna', fetch: fetchAdzuna(jobTitle, city, dateFilter) }];
  if (key) {
    sources.push({ name: 'JSearch (LinkedIn/Indeed/Glassdoor)', fetch: fetchJSearch(jobTitle, city, dateFilter, key) });
  }

  const settled = await Promise.allSettled(sources.map((s) => s.fetch));
  const failedSources = settled.flatMap((result, i) => {
    if (result.status !== 'rejected') return [];
    console.warn('Job source failed:', sources[i].name, result.reason);
    return [sources[i].name];
  });

  if (failedSources.length === sources.length) {
    throw new Error('All job sources failed');
  }

  const jobs = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  return { jobs: dedupeJobs(jobs), failedSources };
};
