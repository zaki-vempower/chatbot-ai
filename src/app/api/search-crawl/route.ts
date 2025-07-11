import { NextRequest, NextResponse } from 'next/server'
import { searxngClient } from '@/lib/searxng'
import { progressTracker } from '@/lib/progress-tracker'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const searchCrawlSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(50).default(20),
  categories: z.array(z.string()).default(['general']),
  groupId: z.string().optional(),
})

// POST - Search and crawl multiple websites
export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { userId } = verifyToken(token)

    const body = await request.json()
    const { query, maxResults, categories, groupId  } = searchCrawlSchema.parse(body)
 
    // Check if SearXNG is available
    const isHealthy = await searxngClient.isHealthy()
    if (!isHealthy) {
      return NextResponse.json({
        error: 'SearXNG service is not available. Please ensure SearXNG is running on localhost:8080'
      }, { status: 503 })
    }

    // Generate a unique session ID for progress tracking
    const sessionId = progressTracker.generateSessionId(userId)

    // Start the crawling process asynchronously
    // We'll return the session ID immediately and let the client poll for progress
    searxngClient.searchAndCrawlWithProgress(sessionId, userId, query, maxResults, categories, groupId)
      .catch(error => {
        console.error('Background crawling error:', error)
        progressTracker.completeProgress(sessionId, error.message)
      })

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Crawling started. Use the session ID to check progress.'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in search crawl:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to search and crawl websites',
        details: 'Make sure SearXNG is running on localhost:8080'
      },
      { status: 500 }
    )
  }
}

// GET - Check SearXNG service health
export async function GET() {
  try {
    const isHealthy = await searxngClient.isHealthy()
    
    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      service: 'SearXNG',
      url: 'http://localhost:8080',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      healthy: false,
      service: 'SearXNG',
      url: 'http://localhost:8080',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
