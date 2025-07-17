// Progress tracking for bulk crawling operations
interface CrawlProgress {
  userId: string
  query: string
  totalUrls: number
  currentIndex: number
  currentUrl: string
  status: 'searching' | 'crawling' | 'completed' | 'error'
  successfulCrawls: number
  failedCrawls: number
  completedUrls: string[]
  startTime: number
  error?: string
}

class ProgressTracker {
  private progressMap = new Map<string, CrawlProgress>()

  // Generate a unique session ID for the crawl operation
  generateSessionId(userId: string): string {
    return `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Start tracking progress for a new crawl session
  startProgress(sessionId: string, userId: string, query: string, totalUrls: number): void {
    this.progressMap.set(sessionId, {
      userId,
      query,
      totalUrls,
      currentIndex: 0,
      currentUrl: 'Searching for URLs...',
      status: 'searching',
      successfulCrawls: 0,
      failedCrawls: 0,
      completedUrls: [],
      startTime: Date.now()
    })
  }

  // Update progress for current crawling operation
  updateProgress(sessionId: string, updates: Partial<CrawlProgress>): void {
    const current = this.progressMap.get(sessionId)
    if (current) {
      this.progressMap.set(sessionId, { ...current, ...updates })
    }
  }

  // Get current progress
  getProgress(sessionId: string): CrawlProgress | null {
    return this.progressMap.get(sessionId) || null
  }

  // Complete the crawling session
  completeProgress(sessionId: string, error?: string): void {
    const current = this.progressMap.get(sessionId)
    if (current) {
      this.progressMap.set(sessionId, {
        ...current,
        status: error ? 'error' : 'completed',
        error
      })
      
      // Clean up after 5 minutes
      setTimeout(() => {
        this.progressMap.delete(sessionId)
      }, 5 * 60 * 1000)
    }
  }

  // Clean up old sessions (called periodically)
  cleanup(): void {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes

    for (const [sessionId, progress] of this.progressMap.entries()) {
      if (now - progress.startTime > maxAge) {
        this.progressMap.delete(sessionId)
      }
    }
  }
}

export const progressTracker = new ProgressTracker()

// Clean up old sessions every 10 minutes
setInterval(() => {
  progressTracker.cleanup()
}, 10 * 60 * 1000)
