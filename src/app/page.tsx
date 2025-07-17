'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box } from '@mui/material'
import { AuthForm } from '@/components/AuthForm'
import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingScreen } from '@/components/LoadingSpinner'

interface User {
  id: string
  email: string
  name?: string
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  messages?: Message[]
  lastMessage?: {
    content: string
    role: string
    createdAt: string
  }
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    
    setIsLoading(false)
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }, [token])

  useEffect(() => {
    if (user && token) {
      loadConversations()
    }
  }, [user, token, loadConversations])

  const handleLogin = (userData: User, userToken: string) => {
    setUser(userData)
    setToken(userToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setConversations([])
    setCurrentConversation(null)
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentConversation(data.conversation)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const handleNewConversation = () => {
    setCurrentConversation(null)
  }

  const handleNewConversationCreated = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    loadConversations() // Refresh the conversation list
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations?id=${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null)
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  if (isLoading) {
    return <LoadingScreen message="Initializing application..." />
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <AuthForm onLogin={handleLogin} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Box sx={{ height: '100vh', display: 'flex', bgcolor: 'background.default' }}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onLogout={handleLogout}
        />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ChatInterface
            conversation={currentConversation || undefined}
            onNewConversation={handleNewConversationCreated}
          />
        </Box>
      </Box>
    </ErrorBoundary>
  )
}
