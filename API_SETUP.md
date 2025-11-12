# Job Search Tool API Setup Guide

This guide will help you set up real job board API integrations for the Job Search Tool.

## Overview

The application now supports real job board APIs instead of mock data. You'll need to obtain API keys from the following services:

- **Theirstack Jobs API** - Comprehensive job search API (recommended)
- **Indeed Jobs API** - Comprehensive job database
- **Glassdoor Jobs API** - Company reviews and job listings
- **Monster Jobs API** - Traditional job board
- **Adzuna Jobs API** - Free job search API (recommended for testing)

**Note:** LinkedIn does not currently offer a public Jobs API. The LinkedIn integration is a placeholder for future use.

## Environment Variables Setup

Create a `.env` file in the root directory of your project with the following variables:

```env
# Theirstack Jobs API (Recommended)
REACT_APP_THEIRSTACK_API_KEY=your_theirstack_api_key

# Indeed Jobs API
REACT_APP_INDEED_PUBLISHER_ID=your_indeed_publisher_id
REACT_APP_INDEED_API_KEY=your_indeed_api_key

# Glassdoor Jobs API
REACT_APP_GLASSDOOR_PARTNER_ID=your_glassdoor_partner_id
REACT_APP_GLASSDOOR_API_KEY=your_glassdoor_api_key

# Monster Jobs API
REACT_APP_MONSTER_API_KEY=your_monster_api_key

# Adzuna Jobs API (Free tier available)
REACT_APP_ADZUNA_APP_ID=your_adzuna_app_id
REACT_APP_ADZUNA_APP_KEY=your_adzuna_app_key
```

## API Setup Instructions

### 1. Theirstack Jobs API (Recommended)

**Setup Steps:**

1. Visit [Theirstack API](https://api.theirstack.com/)
2. Sign up for an account
3. Get your API key
4. Add to environment variables

**Benefits:**

- Comprehensive job database
- Real job data from multiple sources
- Rich job information including salary, skills, and company details
- Easy to set up and use
- Good coverage of job listings

### 2. Indeed Jobs API

**Setup Steps:**

1. Visit [Indeed Publisher](https://www.indeed.com/publisher)
2. Sign up for an account
3. Create a new publisher account
4. Get your Publisher ID
5. Apply for API access

**Note:** Indeed API requires approval and has usage quotas.

### 3. Glassdoor Jobs API

**Setup Steps:**

1. Go to [Glassdoor for Developers](https://www.glassdoor.com/developer/index.htm)
2. Register for an account
3. Create a new application
4. Get your Partner ID and API Key

### 4. Monster Jobs API

**Setup Steps:**

1. Contact Monster's business development team
2. Request API access
3. Get your API key

**Note:** Monster API access is typically for enterprise customers.

### 5. Adzuna Jobs API (Free Tier Available)

**Setup Steps:**

1. Visit [Adzuna API](https://developer.adzuna.com/)
2. Sign up for a free account
3. Create a new application
4. Get your App ID and App Key

**Benefits:**

- Free tier available
- No approval required
- Good coverage of job listings
- Simple setup process

## LinkedIn Jobs API Status

**Important:** LinkedIn does not currently offer a public Jobs API. The available LinkedIn APIs are:

- Share on LinkedIn
- Advertising API
- Lead Sync API
- Live Events
- Sign In with LinkedIn
- Events Management API
- Community Management API
- Conversions API
- LinkedIn Ad Library
- Member Data Portability API
- Pages Data Portability API

None of these APIs provide access to job listings or job search functionality.

## Fallback Behavior

If API keys are not configured, the application will:

1. Use GitHub Repositories API as a fallback
2. Display a warning about missing API configuration
3. Show limited job results

## Testing Your Setup

1. Start the development server:

   ```bash
   npm start
   ```

2. Check the browser console for API status messages
3. Perform a job search to verify API connections
4. Look for real job titles and descriptions instead of placeholder text

## API Status Check

The application includes a method to check API configuration status:

```typescript
import { JobSearchService } from "./services/jobSearchService";

const apiStatus = JobSearchService.getAPIStatus();
console.log("API Status:", apiStatus);
```

This will return an object showing which APIs are properly configured.

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Some APIs may have CORS restrictions. Consider using a proxy or backend service.

2. **Rate Limiting**: APIs have rate limits. The application includes rate limiting to respect these limits.

3. **Authentication Errors**: Double-check your API keys and ensure they're properly formatted.

4. **No Results**: Some APIs may not return results for certain search terms or locations.

### Debug Mode:

Enable debug logging by checking the browser console for detailed API response information.

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all API keys
- Consider using a backend service to proxy API calls for better security
- Monitor API usage to stay within limits

## Next Steps

1. Start with Adzuna API (free and easy to set up)
2. Add Indeed API for comprehensive coverage
3. Consider Glassdoor API for company reviews
4. Monitor API usage and costs

## Support

For API-specific issues, refer to each service's documentation:

- [Indeed Publisher](https://www.indeed.com/publisher)
- [Glassdoor API](https://www.glassdoor.com/developer/index.htm)
- [Adzuna API](https://developer.adzuna.com/)
