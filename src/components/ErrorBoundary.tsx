'use client'

import React from 'react'
import { Button, Card, CardContent, Typography, Box, Avatar } from '@mui/material'
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import i18n from '@/lib/i18n'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} resetError={this.resetError} />
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Card sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 3 }}>
            <CardContent>
              <Avatar
                sx={{
                  bgcolor: 'error.light',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <ErrorIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
                {i18n.t('somethingWentWrong')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {i18n.t('unexpectedError')}
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                  }}
                >
                  <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {this.state.error.message}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  onClick={this.resetError}
                  variant="contained"
                  startIcon={<RefreshIcon />}
                >
                  {i18n.t('tryAgain')}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outlined"
                >
                  {i18n.t('reloadPage')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}