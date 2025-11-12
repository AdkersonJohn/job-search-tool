# Job Search Tool

A comprehensive job search application that aggregates job listings from multiple real job boards and APIs. Built with React, TypeScript, and modern web technologies.

## Features

- **Real Job Data**: Integrates with actual job board APIs (LinkedIn, Indeed, Glassdoor, Monster, Adzuna)
- **Advanced Search**: Search by keywords, location, and date range
- **Rich Job Details**: Display comprehensive job information including requirements, benefits, and skills
- **Multiple Sources**: Aggregate results from multiple job boards
- **Responsive Design**: Works on desktop and mobile devices
- **Rate Limiting**: Built-in rate limiting to respect API limits
- **Error Handling**: Graceful handling of API failures and network issues

## Supported Job Boards

- **Theirstack Jobs** - Comprehensive job search API (recommended)
- **Indeed Jobs** - Comprehensive job database
- **Glassdoor Jobs** - Company reviews and job listings
- **Monster Jobs** - Traditional job board
- **Adzuna Jobs** - Free job search API (recommended for testing)

**Note:** LinkedIn does not currently offer a public Jobs API. The LinkedIn integration is a placeholder for future use.

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd job-search-tool
```

2. Install dependencies:

```bash
npm install
```

3. Set up API keys (see [API Setup Guide](./API_SETUP.md)):

```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start the development server:

```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Configuration

The application requires API keys for real job data. See the [API Setup Guide](./API_SETUP.md) for detailed instructions.

### Quick Setup (Theirstack - Recommended)

1. Visit [Theirstack API](https://api.theirstack.com/)
2. Sign up for an account
3. Get your API key
4. Add your API key to `.env`:

```env
REACT_APP_THEIRSTACK_API_KEY=your_api_key
```

### Alternative Setup (Adzuna - Free)

1. Visit [Adzuna API](https://developer.adzuna.com/)
2. Sign up for a free account
3. Create a new application
4. Add your App ID and App Key to `.env`:

```env
REACT_APP_ADZUNA_APP_ID=your_app_id
REACT_APP_ADZUNA_APP_KEY=your_app_key
```

## Usage

1. **Search Jobs**: Enter keywords, location, and date range
2. **View Results**: Browse job listings with detailed information
3. **Apply**: Click "View Job" or "Apply Now" to go to the job posting
4. **Filter**: Results are automatically filtered by your search criteria

## Job Information Displayed

- **Job Title**: Actual job titles from real postings
- **Company**: Company name and logo (if available)
- **Location**: Job location with remote work indicators
- **Salary**: Salary range and currency
- **Requirements**: Job requirements and qualifications
- **Skills**: Required skills and technologies
- **Benefits**: Company benefits and perks
- **Posted Date**: When the job was posted
- **Employment Type**: Full-time, part-time, contract, etc.

## Architecture

### Components

- `JobSearchForm`: Search interface with filters
- `JobResults`: Display job listings with detailed information
- `JobCard`: Individual job posting component

### Services

- `JobSearchService`: Main service coordinating API calls
- `realJobAPIs.ts`: Individual API implementations
- Rate limiting and error handling

### Data Flow

1. User submits search form
2. `JobSearchService` calls multiple APIs concurrently
3. Results are filtered, deduplicated, and formatted
4. `JobResults` component displays the results
5. Users can click to view or apply for jobs

## API Integration Details

### Rate Limiting

- 10 requests per minute per API
- Automatic retry logic
- Graceful degradation when APIs are unavailable

### Error Handling

- Network error recovery
- API failure fallbacks
- User-friendly error messages
- Console logging for debugging

### Data Sources

The application prioritizes real job data but includes fallbacks:

1. **Primary**: Real job board APIs (LinkedIn, Indeed, etc.)
2. **Fallback**: GitHub repositories (as job-related content)
3. **Demo**: Mock data for testing

## Development

### Available Scripts

- `npm start`: Start development server
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App

### Project Structure

```
src/
├── components/          # React components
│   ├── JobSearchForm.tsx
│   ├── JobResults.tsx
│   └── *.css
├── services/           # API services
│   ├── jobSearchService.ts
│   └── realJobAPIs.ts
├── types/             # TypeScript type definitions
│   └── index.ts
└── App.tsx           # Main application component
```

## Troubleshooting

### Common Issues

1. **No Jobs Found**

   - Check API keys are configured
   - Verify network connectivity
   - Check browser console for errors
   - Try different search terms

2. **API Errors**

   - Verify API keys are correct
   - Check API service status
   - Ensure proper environment variable names
   - Restart development server after adding keys

3. **CORS Issues**
   - Some APIs may have CORS restrictions
   - Consider using a proxy or backend service

### Debug Mode

Check the browser console for detailed API response information and error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Check the [API Setup Guide](./API_SETUP.md)
- Review browser console for error messages
- Verify API keys and configuration
- Check API service status pages

## Roadmap

- [ ] Add more job boards
- [ ] Implement job alerts
- [ ] Add job application tracking
- [ ] Enhanced filtering options
- [ ] Job recommendations
- [ ] Company reviews integration
