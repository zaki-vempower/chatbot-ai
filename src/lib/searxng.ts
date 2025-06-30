import { webCrawler, CrawlResult } from './crawler'
import { progressTracker } from './progress-tracker'

export interface SearchResult {
  title: string
  url: string
  content: string
  engines: string[]
  score: number
}

export interface SearXNGResponse {
  query: string
  number_of_results: number
  results: SearchResult[]
  answers: string[]
  corrections: string[]
  infoboxes: Record<string, unknown>[]
  suggestions: string[]
}

export interface BulkCrawlResult {
  query: string
  totalUrls: number
  successfulCrawls: number
  failedCrawls: number
  crawledPages: Array<{
    url: string
    title: string
    content: string
    success: boolean
    error?: string
  }>
}

export class SearXNGClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl
  }

  // Helper function to crawl with timeout
  private async crawlWithTimeout(url: string, timeoutMs: number = 40000): Promise<CrawlResult> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Crawl timeout after ${timeoutMs / 1000} seconds`))
      }, timeoutMs)

      try {
        const result = await webCrawler.crawlUrl(url)
        clearTimeout(timeoutId)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  async search(query: string, categories: string[] = ['general'], engines: string[] = []): Promise<SearXNGResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        categories: categories.join(','),
      })

      if (engines.length > 0) {
        params.set('engines', engines.join(','))
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ChatbotAI/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`SearXNG API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error searching with SearXNG:', error)
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchAndCrawl(
    userId: string, 
    query: string, 
    maxResults: number = 20,
    categories: string[] = ['general']
  ): Promise<BulkCrawlResult> {
    try {
      // Search for URLs using SearXNG
      const searchResults = await this.search(query, categories)
      
      // Filter and limit results
      const urlsToCrawl = searchResults.results
        .filter(result => result.url && result.url.startsWith('http'))
        .slice(0, maxResults)
        .map(result => result.url)

      console.log(`Found ${urlsToCrawl.length} URLs to crawl for query: "${query}"`)

      const crawledPages: BulkCrawlResult['crawledPages'] = []
      let successfulCrawls = 0
      let failedCrawls = 0

      // Crawl each URL with rate limiting
      for (let i = 0; i < urlsToCrawl.length; i++) {
        const url = urlsToCrawl[i]
        
        try {
          console.log(`Crawling ${i + 1}/${urlsToCrawl.length}: ${url}`)
          
          // Crawl the URL with timeout
          const crawlResult = await this.crawlWithTimeout(url, 40000) // 40 second timeout
          
          // Save to database
          await webCrawler.saveCrawledData(userId, crawlResult)
          
          crawledPages.push({
            url: crawlResult.url,
            title: crawlResult.title || 'Untitled',
            content: crawlResult.content.substring(0, 500) + '...', // Truncate for response
            success: true
          })
          
          successfulCrawls++
          
          // Rate limiting: wait 1 second between requests to be respectful
          if (i < urlsToCrawl.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
        } catch (error) {
          console.error(`Failed to crawl ${url}:`, error)
          crawledPages.push({
            url,
            title: 'Failed to crawl',
            content: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          failedCrawls++
        }
      }

      return {
        query,
        totalUrls: urlsToCrawl.length,
        successfulCrawls,
        failedCrawls,
        crawledPages
      }
      
    } catch (error) {
      console.error('Error in searchAndCrawl:', error)
      throw new Error(`Failed to search and crawl: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchAndCrawlWithProgress(
    sessionId: string,
    userId: string, 
    query: string, 
    maxResults: number = 20,
    categories: string[] = ['general']
  ): Promise<BulkCrawlResult> {
    try {
      // Initialize progress tracking
      progressTracker.startProgress(sessionId, userId, query, 0)
      
      // Search for URLs using SearXNG
      progressTracker.updateProgress(sessionId, { 
        status: 'searching', 
        currentUrl: 'Searching for URLs...' 
      })
      
      const searchResults = await this.search(query, categories)
      
      // Filter and limit results
      const urlsToCrawl = searchResults.results
        .filter(result => result.url && result.url.startsWith('http'))
        .slice(0, maxResults)
        .map(result => result.url)

      console.log(`Found ${urlsToCrawl.length} URLs to crawl for query: "${query}"`)

      // Update progress with total URLs found
      progressTracker.updateProgress(sessionId, { 
        totalUrls: urlsToCrawl.length,
        status: 'crawling'
      })

      const crawledPages: BulkCrawlResult['crawledPages'] = []
      let successfulCrawls = 0
      let failedCrawls = 0

      // Crawl each URL with progress tracking
      for (let i = 0; i < urlsToCrawl.length; i++) {
        const url = urlsToCrawl[i]
        
        // Update progress before crawling each URL
        progressTracker.updateProgress(sessionId, {
          currentIndex: i,
          currentUrl: url,
          status: 'crawling'
        })
        
        try {
          console.log(`Crawling ${i + 1}/${urlsToCrawl.length}: ${url}`)
          
          // Crawl the URL with timeout
          const crawlResult = await this.crawlWithTimeout(url, 40000) // 40 second timeout
          
          // Save to database
          await webCrawler.saveCrawledData(userId, crawlResult)
          
          crawledPages.push({
            url: crawlResult.url,
            title: crawlResult.title || 'Untitled',
            content: crawlResult.content.substring(0, 500) + '...', // Truncate for response
            success: true
          })
          
          successfulCrawls++
          
          // Update progress after successful crawl
          progressTracker.updateProgress(sessionId, {
            successfulCrawls,
            completedUrls: [...(progressTracker.getProgress(sessionId)?.completedUrls || []), url]
          })
          
          // Rate limiting: wait 1 second between requests to be respectful
          if (i < urlsToCrawl.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
        } catch (error) {
          console.error(`Failed to crawl ${url}:`, error)
          crawledPages.push({
            url,
            title: 'Failed to crawl',
            content: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          failedCrawls++
          
          // Update progress after failed crawl
          progressTracker.updateProgress(sessionId, {
            failedCrawls,
            completedUrls: [...(progressTracker.getProgress(sessionId)?.completedUrls || []), url]
          })
        }
      }

      const result = {
        query,
        totalUrls: urlsToCrawl.length,
        successfulCrawls,
        failedCrawls,
        crawledPages
      }

      // Mark as completed
      progressTracker.completeProgress(sessionId)
      
      return result
      
    } catch (error) {
      console.error('Error in searchAndCrawlWithProgress:', error)
      progressTracker.completeProgress(sessionId, error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Failed to search and crawl: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=test&format=json`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      return response.ok
    } catch (error) {
      console.error('SearXNG health check failed:', error)
      return false
    }
  }
}

export const searxngClient = new SearXNGClient()
