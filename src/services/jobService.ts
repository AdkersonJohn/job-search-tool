import axios from 'axios';

const ADZUNA_APP_ID = "085d8a01";
const ADZUNA_API_KEY = "8fbd3b9536418b89512a0b9c712a38c6";
const ADZUNA_BASE_URL = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}&results_per_page=50`;

export const searchJobs = async (jobTitle: string, city: string, dateFilter: 'any' | '24hrs' | 'week'): Promise<{ title: string; company: string; url: string }[]> => {
  console.log(`Searching for ${jobTitle} in ${city} with filter ${dateFilter} using Adzuna API and other sources`);

  let allJobLinks: { title: string; company: string; url: string }[] = [];

  let adzunaUrl = `${ADZUNA_BASE_URL}&what=${jobTitle}&where=${city}`;

  if (dateFilter === '24hrs') {
    adzunaUrl += '&max_days_old=1';
  } else if (dateFilter === 'week') {
    adzunaUrl += '&max_days_old=7';
  }

  // Adzuna API call
  try {
    const response = await axios.get(adzunaUrl);
    const jobData = response.data.results;

    if (jobData && jobData.length > 0) {
      const adzunaJobs = jobData.map((job: any) => ({
        title: job.title,
        company: job.company.display_name,
        url: job.redirect_url,
      }));
      allJobLinks = allJobLinks.concat(adzunaJobs);
    }
  } catch (error) {
    console.error("Error fetching jobs from Adzuna:", error);
  }

  // Mock links for other job boards (cannot filter by date)
  const mockJobs = [
    { title: `${jobTitle} in ${city}`, company: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${jobTitle}&location=${city}` },
    { title: `${jobTitle} in ${city}`, company: "Indeed", url: `https://www.indeed.com/jobs?q=${jobTitle}&l=${city}` },
    { title: `${jobTitle} in ${city}`, company: "Monster", url: `https://www.monster.com/jobs/search/?q=${jobTitle}&where=${city}` }
  ];

  allJobLinks = allJobLinks.concat(mockJobs);

  return allJobLinks;
};
