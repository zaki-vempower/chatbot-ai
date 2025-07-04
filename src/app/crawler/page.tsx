'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

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
        setError(t('crawler.loginToView'))
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
        setError(t('crawler.failedToLoad'))
      }
    } catch (error) {
      console.error('Error loading crawled pages:', error)
      setError(t('crawler.failedToLoad'))
    }
  }, [t])

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
      setSuccess(`${t('crawler.successfullyCrawled')}: ${data.data.title || crawlUrl}`)
      
      // Refresh the list
      loadCrawledPages()
    } catch (error) {
      console.error('Error crawling website:', error)
      setError(error instanceof Error ? error.message : t('crawler.crawlError'))
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
      currentUrl: t('crawler.startingSearch'),
      status: 'searching',
      successfulCrawls: 0,
      failedCrawls: 0,
      percentage: 0,
      timeElapsed: 0
    })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/search-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: searchQuery })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('crawler.bulkCrawlError'))
      }

      const data = await response.json()
      setCrawlSessionId(data.sessionId)
      setSuccess(t('crawler.bulkCrawlStarted'))
    } catch (error) {
      console.error('Error starting bulk crawl:', error)
      setError(error instanceof Error ? error.message : t('crawler.bulkCrawlError'))
      setIsBulkCrawling(false)
    }
  }

  const stopBulkCrawl = async () => {
    if (!crawlSessionId) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/crawl-progress?sessionId=${crawlSessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setSuccess(t('crawler.bulkCrawlStopped'))
    } catch (error) {
      console.error('Error stopping bulk crawl:', error)
      setError(t('crawler.stopBulkCrawlError'))
    } finally {
      setIsBulkCrawling(false)
      setCrawlSessionId(null)
      setBulkCrawlProgress(null)
    }
  }

  // Effect to poll for bulk crawl progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const checkProgress = async () => {
      if (!crawlSessionId) return

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/crawl-progress?sessionId=${crawlSessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const progressData = await response.json()
          setBulkCrawlProgress(progressData)

          if (progressData.status === 'completed' || progressData.status === 'stopped') {
            setIsBulkCrawling(false)
            setCrawlSessionId(null)
            loadCrawledPages() // Refresh the list
            if (progressData.status === 'completed') {
              setSuccess(t('crawler.bulkCrawlComplete'))
            }
          }
        } else if (response.status === 404) {
          // Session is gone, stop polling
          setIsBulkCrawling(false)
          setCrawlSessionId(null)
          setBulkCrawlProgress(null)
          loadCrawledPages()
          setSuccess(t('crawler.bulkCrawlSessionFinished'))
        }
      } catch (error) {
        console.error('Error fetching crawl progress:', error)
        setError(t('crawler.progressError'))
        setIsBulkCrawling(false) // Stop on error
        setCrawlSessionId(null)
      }
    }

    if (isBulkCrawling && crawlSessionId) {
      interval = setInterval(checkProgress, 2000) // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isBulkCrawling, crawlSessionId, loadCrawledPages, t])

  const handleDelete = async () => {
    if (!deleteDialog.pageId) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/crawled-data/${deleteDialog.pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setSuccess(t('crawler.pageDeleted'))
        loadCrawledPages()
      } else {
        setError(t('crawler.deleteError'))
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      setError(t('crawler.deleteError'))
    } finally {
      setDeleteDialog({ open: false, pageId: null })
    }
  }

  const openDeleteDialog = (pageId: string) => {
    setDeleteDialog({ open: true, pageId })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, pageId: null })
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} />
  }

  const filteredPages = crawledPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <CrawlerContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('crawler.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          component={NextLink}
          href="/"
        >
          {t('crawler.backToChat')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <StyledCard>
        <CardHeader
          title={t('crawler.crawl.title')}
          subheader={t('crawler.crawl.description')}
        />
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              label={t('crawler.crawl.urlLabel')}
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              placeholder={t('crawler.crawl.placeholder')}
              disabled={isCrawling || isBulkCrawling}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={crawlWebsite}
              disabled={isCrawling || isBulkCrawling || !crawlUrl.trim()}
              startIcon={isCrawling ? <CircularProgress size={20} color="inherit" /> : <GlobeIcon />}
            >
              {isCrawling ? t('crawler.crawl.crawling') : t('crawler.crawl.crawl')}
            </Button>
          </Box>
        </CardContent>
      </StyledCard>

      <StyledCard>
        <CardHeader
          title={t('crawler.bulkCrawl.title')}
          subheader={t('crawler.bulkCrawl.description')}
        />
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: isBulkCrawling ? 2 : 0 }}>
            <TextField
              fullWidth
              variant="outlined"
              label={t('crawler.bulkCrawl.queryLabel')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('crawler.bulkCrawl.placeholder')}
              disabled={isCrawling || isBulkCrawling}
            />
            {isBulkCrawling ? (
              <Button
                variant="contained"
                color="error"
                onClick={stopBulkCrawl}
                disabled={!crawlSessionId}
              >
                {t('crawler.bulkCrawl.stop')}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={searchAndCrawlBulk}
                disabled={isCrawling || isBulkCrawling || !searchQuery.trim()}
                startIcon={isBulkCrawling ? <CircularProgress size={20} color="inherit" /> : <BulkCrawlIcon />}
              >
                {t('crawler.bulkCrawl.searchAndCrawl')}
              </Button>
            )}
          </Box>
          {isBulkCrawling && bulkCrawlProgress && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                {t('crawler.bulkCrawl.progress.crawling', { currentUrl: bulkCrawlProgress.currentUrl, currentIndex: bulkCrawlProgress.currentIndex, totalUrls: bulkCrawlProgress.totalUrls })}
              </Typography>
              <LinearProgress variant="determinate" value={bulkCrawlProgress.percentage} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">{t('crawler.bulkCrawl.progress.status')}: {bulkCrawlProgress.status}</Typography>
                <Typography variant="caption">{t('crawler.bulkCrawl.progress.success')}: {bulkCrawlProgress.successfulCrawls}</Typography>
                <Typography variant="caption">{t('crawler.bulkCrawl.progress.failed')}: {bulkCrawlProgress.failedCrawls}</Typography>
                <Typography variant="caption">{t('crawler.bulkCrawl.progress.time')}: {Math.round(bulkCrawlProgress.timeElapsed)}s</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </StyledCard>

      <Card>
        <CardHeader
          title={t('crawler.crawledPages.title')}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                variant="outlined"
                size="small"
                label={t('crawler.crawledPages.searchLabel')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('crawler.crawledPages.searchPlaceholder')}
              />
              <IconButton onClick={loadCrawledPages} title={t('crawler.crawledPages.refresh')}>
                <RefreshIcon />
              </IconButton>
            </Box>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('crawler.crawledPages.table.title')}</TableCell>
                  <TableCell>{t('crawler.crawledPages.table.url')}</TableCell>
                  <TableCell>{t('crawler.crawledPages.table.crawledAt')}</TableCell>
                  <TableCell align="right">{t('crawler.crawledPages.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {page.title || t('crawler.crawledPages.noTitle')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Link href={page.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LaunchIcon fontSize="inherit" />
                          {page.url}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(page.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => openDeleteDialog(page.id)} color="error" title={t('crawler.crawledPages.delete')}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('crawler.crawledPages.noResults')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
        <DialogTitle>{t('crawler.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('crawler.deleteDialog.content')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error">{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </CrawlerContainer>
  )
}
