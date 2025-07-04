'use client'

import Link from 'next/link'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
} from '@mui/material'
import {
  Chat as ChatIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
  SmartToy as BotIcon,
  Language as CrawlerIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: 320,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 320,
    boxSizing: 'border-box',
    background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}))

const StyledHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}))

const ConversationItem = styled(ListItemButton)(({ theme }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(1.5),
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: {
    content: string
    role: string
    createdAt: string
  }
}

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId?: string
  onSelectConversation: (conversation: Conversation) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onLogout: () => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onLogout,
}: SidebarProps) {
  const { t } = useTranslation()
  return (
    <StyledDrawer variant="permanent" anchor="left">
      <StyledHeader>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <BotIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            {t('appTitle')}
          </Typography>
        </Box>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNewConversation}
          size="large"
          sx={{ py: 1.5, mb: 1 }}
        >
          {t('newConversation')}
        </Button>
        <Link href="/crawler" style={{ textDecoration: 'none' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<CrawlerIcon />}
            size="large"
            sx={{ py: 1.5 }}
          >
            {t('webCrawler')}
          </Button>
        </Link>
      </StyledHeader>
      <Box flex={1} overflow="auto" py={1}>
        {conversations.length === 0 ? (
          <Box textAlign="center" p={4}>
            <ChatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('noConversationsYet')}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {t('startNewChat')}
            </Typography>
          </Box>
        ) : (
          <List sx={{ px: 1 }}>
            {conversations.map((conversation) => (
              <Paper key={conversation.id} elevation={0} sx={{ mb: 1 }}>
                <ConversationItem
                  selected={currentConversationId === conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <ListItemIcon>
                    <ChatIcon color={currentConversationId === conversation.id ? 'inherit' : 'action'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="subtitle2" 
                        noWrap 
                        fontWeight={currentConversationId === conversation.id ? 600 : 400}
                      >
                        {conversation.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </Typography>
                        {conversation.messageCount > 0 && (
                          <Chip 
                            label={t('messagesCount', { count: conversation.messageCount })}
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteConversation(conversation.id)
                    }}
                    sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ConversationItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>
      <Box p={2} borderTop="1px solid" borderColor="divider" bgcolor="background.paper">
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          color="inherit"
        >
          {t('signOut')}
        </Button>
      </Box>
    </StyledDrawer>
  )
}
