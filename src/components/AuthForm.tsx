'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
  padding: theme.spacing(3),
}))

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  width: '100%',
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
}))

interface AuthFormProps {
  onLogin: (user: { id: string; email: string; name?: string }, token: string) => void
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const { t } = useTranslation()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      onLogin(data.user, data.token)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <StyledContainer maxWidth={false}>
      <StyledCard>
        <CardContent>
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
              {isLogin ? t('welcomeBack') : t('createAccount')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isLogin 
                ? t('signInToContinue')
                : t('joinUsToChat')
              }
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <TextField
                fullWidth
                label={t('fullName')}
                name="name"
                type="text"
                required={!isLogin}
                value={formData.name}
                onChange={handleInputChange}
                margin="normal"
                variant="outlined"
              />
            )}
            <TextField
              fullWidth
              label={t('emailAddress')}
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              margin="normal"
              variant="outlined"
              autoComplete="email"
            />
            <TextField
              fullWidth
              label={t('password')}
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              variant="outlined"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              inputProps={{ minLength: 6 }}
              helperText={!isLogin ? t('passwordHelper') : ''}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} color="inherit" />
                  {isLogin ? t('signingIn') : t('creatingAccount')}
                </Box>
              ) : (
                isLogin ? t('signIn') : t('createAccount')
              )}
            </Button>
            <Box textAlign="center" pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="body2" color="text.secondary">
                {isLogin ? t('noAccount') : t('alreadyAccount')}
                <MuiLink
                  component="button"
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  underline="hover"
                  color="primary"
                  fontWeight="medium"
                >
                  {isLogin ? t('createOne') : t('signIn')}
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </StyledCard>
    </StyledContainer>
  )
}
