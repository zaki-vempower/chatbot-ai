'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { useToast } from '@/components/ToastProvider'

const MessageBox = styled(Paper)<{ role: 'user' | 'assistant' }>(({ theme, role }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  maxWidth: '75%',
  ...(role === 'user' ? {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    marginLeft: 'auto',
  } : {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  }),
}))

const ChatContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}))

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.grey[50],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))

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

interface ChatInterfaceProps {
  conversation?: Conversation
  onNewConversation: (conversation: Conversation) => void
}

export function ChatInterface({ conversation, onNewConversation }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(conversation?.messages || [])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini' | 'deepseek' | 'llama'>('openai')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages)
    }
  }, [conversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId: conversation?.id,
          provider,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      
      if (!conversation && data.conversation) {
        onNewConversation(data.conversation)
      }

      setMessages(prev => [...prev, data.message])
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('Failed to send message. Please try again.', 'error')
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Sorry, there was an error processing your message.',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <ChatContainer>
      {/* Header */}
      <Paper sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {conversation?.title || 'New Conversation'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Chat with AI using {
                provider === 'openai' ? 'OpenAI GPT' : 
                provider === 'claude' ? 'Anthropic Claude' : 
                provider === 'gemini' ? 'Google Gemini' : 
                provider === 'deepseek' ? 'DeepSeek' :
                'Llama (Local)'
              }
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" fontWeight="medium">
              AI Provider:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'openai' | 'claude' | 'gemini' | 'deepseek' | 'llama')}
                variant="outlined"
              >
                <MenuItem value="openai">OpenAI GPT</MenuItem>
                <MenuItem value="claude">Anthropic Claude</MenuItem>
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="deepseek">DeepSeek</MenuItem>
                <MenuItem value="llama">Llama (Local)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Messages */}
      <MessagesContainer>
        {messages.length === 0 ? (
          <Box textAlign="center" mt={10}>
            <BotIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 3 }} />
            <Typography variant="h5" fontWeight="bold" color="text.secondary" gutterBottom>
              Ready to chat!
            </Typography>
            <Typography variant="body1" color="text.disabled">
              Start a conversation with your AI assistant
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              display="flex"
              gap={2}
              justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
            >
              {message.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <BotIcon />
                </Avatar>
              )}
              <MessageBox role={message.role}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {message.content}
                </Typography>
                <Typography 
                  variant="caption" 
                  color={message.role === 'user' ? 'primary.contrastText' : 'text.secondary'}
                  sx={{ mt: 1, display: 'block' }}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </MessageBox>
              {message.role === 'user' && (
                <Avatar sx={{ bgcolor: 'grey.600' }}>
                  <UserIcon />
                </Avatar>
              )}
            </Box>
          ))
        )}
        {isLoading && (
          <Box display="flex" gap={2} justifyContent="flex-start">
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <BotIcon />
            </Avatar>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      {/* Input */}
      <Paper sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={2} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder="Type your message here... Press Enter to send, Shift+Enter for new line"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            variant="contained"
            sx={{ height: 56, minWidth: 56 }}
          >
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <SendIcon />
            )}
          </Button>
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="caption" color="text.secondary">
            AI responses are generated and may contain inaccuracies
          </Typography>
          <Chip
            label={`${inputMessage.length}/2000 characters`}
            size="small"
            color={inputMessage.length > 1000 ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>
      </Paper>
    </ChatContainer>
  )
}
