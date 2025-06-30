'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  LinearProgress,
} from '@mui/material'
import {
  Language as GlobeIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  TravelExplore as BulkCrawlIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import NextLink from 'next/link'
import { AuthForm } from '@/components/AuthForm'
import { LoadingScreen } from '@/components/LoadingSpinner'

const StyledCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  marginBottom: theme.spacing(3),
}))

const CrawlerContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1200,
  margin: '0 auto',
}))

interface User {
  id: string
  email: string
  name?: string
}

interface CrawledPage {
  id: string
  url: string
  title: string
  content: string
  createdAt: string
}

export default function CrawlerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([])
  const [crawlUrl, setCrawlUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCrawling, setIsCrawling] = useState(false)
  const [isBulkCrawling, setIsBulkCrawling] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [crawlSessionId, setCrawlSessionId] = useState<string | null>(null)
  const [bulkCrawlProgress, setBulkCrawlProgress] = useState<{
    query: string
    totalUrls: number
    currentIndex: number
    currentUrl: string
    status: string
    successfulCrawls: number
    failedCrawls: number
    percentage: number
    timeElapsed: number
  } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pageId: string | null }>({
    open: false,
    pageId: null,
  })

  // Check authentication on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const loadCrawledPages = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view crawled pages')
        return
      }

      const response = await fetch('/api/crawl', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCrawledPages(data.pages || [])
      } else {
        setError('Failed to load crawled pages')
      }
    } catch (error) {
      console.error('Error loading crawled pages:', error)
      setError('Failed to load crawled pages')
    }
  }, [])

  // Load crawled pages when authenticated
  useEffect(() => {
    if (user) {
      loadCrawledPages()
    }
  }, [user, loadCrawledPages])

  const crawlWebsite = async () => {
    if (!crawlUrl.trim()) return

    setIsCrawling(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: crawlUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to crawl website')
      }

      const data = await response.json()
      setCrawlUrl('')
      setSuccess(`Successfully crawled: ${data.data.title || crawlUrl}`)
      
      // Refresh the list
      loadCrawledPages()
    } catch (error) {
      console.error('Error crawling website:', error)
      setError(error instanceof Error ? error.message : 'Failed to crawl the website. Please check the URL and try again.')
    } finally {
      setIsCrawling(false)
    }
  }

  const searchAndCrawlBulk = async () => {
    if (!searchQuery.trim()) return

    setIsBulkCrawling(true)
    setError('')
    setSuccess('')
    setBulkCrawlProgress({
      query: searchQuery,
      totalUrls: 0,
      currentIndex: 0,
      currentUrl: 'Starting search...',
      status: 'searching',
      successfulCrawls: 0,
      failedCrawls: 0,
      percentage: 0,
      timeElapsed: 0
    })

    try {
      const token = localStorage.getItem('token')
      
      // Start the crawling process
      const response = await fetch('/api/search-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          query: searchQuery,
          maxResults: 20,
          categories: ['general']
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start bulk crawling')
      }

      const data = await response.json()
      const sessionId = data.sessionId
      setCrawlSessionId(sessionId)

      // Start polling for progress
      pollCrawlProgress(sessionId, token as string)
      
    } catch (error) {
      console.error('Error starting bulk crawling:', error)
      setError(error instanceof Error ? error.message : 'Failed to start bulk crawling.')
      setIsBulkCrawling(false)
      setBulkCrawlProgress(null)
    }
  }

  const pollCrawlProgress = async (sessionId: string, token: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/crawl-progress?sessionId=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to get progress')
        }

        const data = await response.json()
        const progress = data.progress

        setBulkCrawlProgress({
          query: progress.query,
          totalUrls: progress.totalUrls,
          currentIndex: progress.currentIndex,
          currentUrl: progress.currentUrl,
          status: progress.status,
          successfulCrawls: progress.successfulCrawls,
          failedCrawls: progress.failedCrawls,
          percentage: progress.percentage,
          timeElapsed: progress.timeElapsed
        })

        // Check if completed
        if (progress.status === 'completed' || progress.status === 'error') {
          clearInterval(pollInterval)
          setIsBulkCrawling(false)
          setCrawlSessionId(null)
          
          if (progress.status === 'completed') {
            setSearchQuery('')
            setSuccess(
              `Successfully crawled ${progress.successfulCrawls} out of ${progress.totalUrls} websites for query: "${progress.query}"`
            )
            // Refresh the list
            loadCrawledPages()
          } else {
            setError(progress.error || 'Bulk crawling failed')
          }
          
          setBulkCrawlProgress(null)
        }
        
      } catch (error) {
        console.error('Error polling progress:', error)
        clearInterval(pollInterval)
        setIsBulkCrawling(false)
        setBulkCrawlProgress(null)
        setError('Failed to track crawling progress')
      }
    }, 1500) // Poll every 1.5 seconds
  }

  const deleteCrawledPage = async (pageId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/crawl?id=${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setCrawledPages(prev => prev.filter(page => page.id !== pageId))
        setSuccess('Page deleted successfully')
      } else {
        setError('Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      setError('Failed to delete page')
    }
    setDeleteDialog({ open: false, pageId: null })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      crawlWebsite()
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchAndCrawlBulk()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  if (isLoading) {
    return <LoadingScreen message="Loading crawler..." />
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} />
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <NextLink href="/" style={{ textDecoration: 'none' }}>
          <Button
            startIcon={<BackIcon />}
            variant="outlined"
            size="small"
          >
            Back to Chat
          </Button>
        </NextLink>
      </Box>

      <CrawlerContainer>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
          Web Crawler Manager
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Crawl websites to extract content for AI knowledge enhancement. Manage your crawled pages below.
        </Typography>

        {/* Crawler Input Section */}
        <StyledCard>
          <CardHeader>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <GlobeIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                Crawl New Website
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Enter a URL to crawl and extract content for AI knowledge enhancement
            </Typography>
          </CardHeader>
          <CardContent>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                placeholder="https://example.com - Enter any URL to crawl and analyze..."
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                variant="outlined"
                disabled={isCrawling}
              />
              <Button
                onClick={crawlWebsite}
                disabled={isCrawling || !crawlUrl.trim()}
                variant="contained"
                sx={{ minWidth: 160, height: 56 }}
              >
                {isCrawling ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Crawling...
                  </>
                ) : (
                  'Crawl Website'
                )}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}
          </CardContent>
        </StyledCard>

        {/* Bulk Crawler Section */}
        <StyledCard>
          <CardHeader>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <BulkCrawlIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                Bulk Crawl Websites
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Search and crawl multiple websites at once using SearXNG. Each site has a 40-second timeout to prevent delays.
            </Typography>
          </CardHeader>
          <CardContent>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                placeholder="Enter search query, e.g., 'AI news'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                variant="outlined"
                disabled={isBulkCrawling}
              />
              <Button
                onClick={searchAndCrawlBulk}
                disabled={isBulkCrawling || !searchQuery.trim()}
                variant="contained"
                sx={{ minWidth: 160, height: 56 }}
              >
                {isBulkCrawling ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Crawling...
                  </>
                ) : (
                  'Bulk Crawl'
                )}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            {bulkCrawlProgress && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {bulkCrawlProgress.status === 'searching' ? 'Searching for URLs...' : 
                     bulkCrawlProgress.status === 'crawling' ? `Crawling ${bulkCrawlProgress.currentIndex + 1} of ${bulkCrawlProgress.totalUrls}` :
                     bulkCrawlProgress.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bulkCrawlProgress.percentage}%
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={bulkCrawlProgress.percentage}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Current:</strong> {bulkCrawlProgress.currentUrl}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="success.main">
                    ✅ {bulkCrawlProgress.successfulCrawls} successful
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    ❌ {bulkCrawlProgress.failedCrawls} failed
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ⏱️ {Math.round(bulkCrawlProgress.timeElapsed / 1000)}s
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </StyledCard>

        {/* Context Summary Card */}
        <StyledCard>
          <CardHeader>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <GlobeIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                AI Context Available
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Your crawled content is automatically used as context in AI conversations
            </Typography>
          </CardHeader>
          <CardContent>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
              <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {crawledPages.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Pages Crawled
                </Typography>
              </Box>
              <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  ✓
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auto Context Mode
                </Typography>
              </Box>
              <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={2}>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {Math.round(crawledPages.reduce((acc, page) => acc + (page.content?.length || 0), 0) / 1000)}K
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Characters Available
                </Typography>
              </Box>
            </Box>
            
            {crawledPages.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>How it works:</strong> When you chat with AI, all your crawled content is automatically 
                  included as context. The AI can reference information from all {crawledPages.length} crawled 
                  pages to provide more informed responses.
                </Typography>
              </Alert>
            )}
            
            {crawledPages.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>No context available:</strong> Crawl some websites first to give the AI additional 
                  knowledge to work with in your conversations.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </StyledCard>

        {/* Crawled Pages Table */}
        <Card>
          <CardHeader>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight="bold">
                Crawled Pages ({crawledPages.length})
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadCrawledPages}
                variant="outlined"
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </CardHeader>
          <CardContent sx={{ p: 0 }}>
            {crawledPages.length === 0 ? (
              <Box textAlign="center" p={6}>
                <GlobeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No pages crawled yet
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Crawl your first website to see it appear here
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>URL</TableCell>
                      <TableCell>Date Crawled</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {crawledPages.map((page) => (
                      <TableRow key={page.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {truncateText(page.title || 'Untitled', 50)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="primary"
                            underline="hover"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            {truncateText(page.url, 40)}
                            <LaunchIcon sx={{ fontSize: 14 }} />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(page.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Indexed"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => setDeleteDialog({ open: true, pageId: page.id })}
                            color="error"
                            size="small"
                            title="Delete crawled page"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, pageId: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Crawled Page</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this crawled page? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, pageId: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteDialog.pageId && deleteCrawledPage(deleteDialog.pageId)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CrawlerContainer>
    </Box>
  )
}
