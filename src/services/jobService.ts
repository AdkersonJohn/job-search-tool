import axios from 'axios';
import { Job, dedupeJobs, mapAdzunaJobs, mapJSearchJobs } from './jobUtils';

const JSEARCH_KEY_STORAGE = 'jsearch_api_key';
const ADZUNA_ID_STORAGE = 'adzuna_app_id';
const ADZUNA_KEY_STORAGE = 'adzuna_app_key';

export type DateFilter = 'any' | '24hrs' | 'week';

const read = (storageKey: string): string => localStorage.getItem(storageKey) ?? '';

export const getJSearchKey = (): string => read(JSEARCH_KEY_STORAGE);

export const setJSearchKey = (key: string): void => {
  localStorage.setItem(JSEARCH_KEY_STORAGE, key.trim());
};

export type AdzunaCredentials = { appId: string; appKey: string };

export const getAdzunaCredentials = (): AdzunaCredentials => ({
  appId: read(ADZUNA_ID_STORAGE),
  appKey: read(ADZUNA_KEY_STORAGE),
});

export const setAdzunaCredentials = ({ appId, appKey }: AdzunaCredentials): void => {
  localStorage.setItem(ADZUNA_ID_STORAGE, appId.trim());
  localStorage.setItem(ADZUNA_KEY_STORAGE, appKey.trim());
};

export const hasConfiguredSource = (): boolean => {
  const { appId, appKey } = getAdzunaCredentials();
  return Boolean((appId && appKey) || getJSearchKey());
};

const fetchAdzuna = async (
  jobTitle: string,
  city: string,
  dateFilter: DateFilter,
  { appId, appKey }: AdzunaCredentials,
): Promise<Job[]> => {
  const params: Record<string, string> = {
    app_id: appId,
    app_key: appKey,
    results_per_page: '50',
    what: jobTitle,
    where: city,
  };

  if (dateFilter === '24hrs') {
    params.max_days_old = '1';
  } else if (dateFilter === 'week') {
    params.max_days_old = '7';
  }

  const response = await axios.get('https://api.adzuna.com/v1/api/jobs/us/search/1', { params });
  return mapAdzunaJobs(response.data.results);
};

const fetchJSearch = async (
  jobTitle: string,
  city: string,
  dateFilter: DateFilter,
  key: string,
): Promise<Job[]> => {
  const datePosted = dateFilter === '24hrs' ? 'today' : dateFilter === 'week' ? 'week' : 'all';
  const response = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
    params: { query: `${jobTitle} in ${city}`, date_posted: datePosted },
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
  });
  return mapJSearchJobs(response.data.data?.jobs);
};

export type SearchResult = { jobs: Job[]; failedSources: string[] };

export const NO_SOURCES_ERROR = 'No job sources configured';

export const searchJobs = async (
  jobTitle: string,
  city: string,
  dateFilter: DateFilter,
): Promise<SearchResult> => {
  const adzuna = getAdzunaCredentials();
  const jsearchKey = getJSearchKey();
  const sources: { name: string; fetch: Promise<Job[]> }[] = [];

  if (adzuna.appId && adzuna.appKey) {
    sources.push({ name: 'Adzuna', fetch: fetchAdzuna(jobTitle, city, dateFilter, adzuna) });
  }
  if (jsearchKey) {
    sources.push({
      name: 'JSearch (LinkedIn/Indeed/Glassdoor)',
      fetch: fetchJSearch(jobTitle, city, dateFilter, jsearchKey),
    });
  }

  if (sources.length === 0) {
    throw new Error(NO_SOURCES_ERROR);
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
