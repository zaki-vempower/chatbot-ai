import { NextRequest, NextResponse } from 'next/server'
import { progressTracker } from '@/lib/progress-tracker'
import { verifyToken } from '@/lib/auth'

// GET - Get progress for a crawl session
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { userId } = verifyToken(token)

    // Get session ID from query params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Get progress for the session
    const progress = progressTracker.getProgress(sessionId)
    
    if (!progress) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    // Verify the session belongs to the user
    if (progress.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      progress: {
        query: progress.query,
        totalUrls: progress.totalUrls,
        currentIndex: progress.currentIndex,
        currentUrl: progress.currentUrl,
        status: progress.status,
        successfulCrawls: progress.successfulCrawls,
        failedCrawls: progress.failedCrawls,
        completedUrls: progress.completedUrls.length,
        percentage: progress.totalUrls > 0 ? Math.round((progress.currentIndex / progress.totalUrls) * 100) : 0,
        timeElapsed: Date.now() - progress.startTime,
        error: progress.error
      }
    })
  } catch (error) {
    console.error('Error getting crawl progress:', error)
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    )
  }
}
