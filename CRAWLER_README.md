# Web Crawl2. **Bulk Search-Based Crawling**
- Search the web using SearXNG and crawl multiple results automatically
- Enter search queries like "AI news", "machine learning tutorials", etc.
- Automatically crawl up to 20 websites from search results
- Rate-limited crawling (1 second between requests) to be respectful to websites
- 40-second timeout per website to prevent delays on slow sitesth SearXNG Integration

This application now includes a powerful web crawler with search-based bulk crawling capabilities using SearXNG.

## Features

### 1. Single URL Crawling
- Crawl individual websites by entering a URL
- Extract title and main content from web pages
- Store crawled content in the database for AI knowledge enhancement

### 2. Bulk Search-Based Crawling
- Search the web using SearXNG and crawl multiple results automatically
- Enter search queries like "AI news", "machine learning tutorials", etc.
- Automatically crawl up to 20 websites from search results
- Rate-limited crawling (1 second between requests) to be respectful to websites

## Setup Instructions

### Prerequisites
- Docker and Docker Compose installed
- Node.js application running on port 3001

### Quick Setup with SearXNG

1. **Start SearXNG Service:**
   ```bash
   # Run the setup script to install and start SearXNG
   ./setup-searxng.sh
   ```

   This script will:
   - Download and configure SearXNG with Docker
   - Start the service on http://localhost:8080
   - Generate secure configuration
   - Test the API connection

2. **Verify SearXNG is Running:**
   ```bash
   # Test the search API
   curl 'http://localhost:8080/search?q=test&format=json'
   ```

3. **Access the Web Crawler:**
   - Navigate to http://localhost:3001/crawler
   - Login with your account
   - Start crawling!

### Manual SearXNG Setup

If you prefer to set up SearXNG manually:

```bash
# Create directory
mkdir searxng && cd searxng

# Download configuration
curl -O https://raw.githubusercontent.com/searxng/searxng-docker/master/docker-compose.yaml
curl -O https://raw.githubusercontent.com/searxng/searxng-docker/master/.env

# Generate secret key
sed -i "s/SEARXNG_SECRET=.*/SEARXNG_SECRET=$(openssl rand -hex 32)/" .env

# Start SearXNG
docker-compose up -d

# Check status
docker-compose ps
```

## Usage

### Single URL Crawling
1. Go to the "Crawl New Website" section
2. Enter a URL (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence)
3. Click "Crawl Website" or press Enter
4. The content will be extracted and stored

### Bulk Search Crawling
1. Go to the "Bulk Crawl Websites" section
2. Enter a search query (e.g., "machine learning tutorials")
3. Click "Bulk Crawl" or press Enter
4. The system will:
   - Search SearXNG for relevant websites
   - Extract up to 20 URLs from results
   - Crawl each website automatically
   - Show progress and results

### Managing Crawled Content
- View all crawled pages in the table below
- See title, URL, crawl date, and status
- Delete individual pages using the delete button
- Refresh the list with the refresh button

## API Endpoints

### Search and Crawl API
- **POST** `/api/search-crawl` - Search and bulk crawl websites
- **GET** `/api/search-crawl` - Check SearXNG service health

### Single Crawl API
- **POST** `/api/crawl` - Crawl a single URL
- **GET** `/api/crawl` - Get all user's crawled pages
- **DELETE** `/api/crawl?id={pageId}` - Delete a crawled page

## Configuration

The SearXNG integration can be configured in `/src/lib/searxng.ts`:

```typescript
// Default SearXNG URL
const searxngClient = new SearXNGClient('http://localhost:8080')

// Customize search parameters
await searxngClient.searchAndCrawl(
  userId, 
  query, 
  maxResults, // default: 20
  categories  // default: ['general']
)
```

## Troubleshooting

### SearXNG Not Responding
```bash
# Check if SearXNG is running
curl http://localhost:8080/search?q=test&format=json

# Check Docker containers
cd searxng && docker-compose ps

# View logs
cd searxng && docker-compose logs
```

### Crawling Errors
- Some websites may block crawlers (403/404 errors are normal)
- Rate limiting prevents overwhelming target servers
- Check the browser console for detailed error messages

### Performance
- Bulk crawling is intentionally rate-limited
- Large queries may take several minutes to complete
- Progress is shown in real-time during bulk operations

## Advanced Features

### Custom Search Categories
You can modify the search categories in the crawler code:
- `general` - Web search results
- `news` - News articles
- `science` - Scientific papers
- `it` - Technology content

### Rate Limiting
The crawler includes built-in rate limiting:
- 1 second delay between requests
- Respects robots.txt (planned feature)
- User-Agent identification for transparency

## Security Notes

- All crawling requires user authentication
- Crawled content is associated with user accounts
- SearXNG runs locally for privacy
- No external search APIs required

## Stopping Services

```bash
# Stop SearXNG
cd searxng && docker-compose down

# Stop the main application
# Press Ctrl+C in the npm dev terminal
```

This setup provides a powerful, privacy-focused web crawling solution that can gather relevant content from across the web for AI knowledge enhancement.
