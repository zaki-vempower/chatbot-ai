
"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useToast } from "@/components/ToastProvider";
// import i18n from '@/lib/i18n'
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import * as prismThemes from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

console.log("prisma theme ", prismThemes);

const MessageBox = styled(Paper)<{ role: "user" | "assistant" }>(
  ({ theme, role }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    maxWidth: "75%",
    ...(role === "user"
      ? {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          marginLeft: "auto",
        }
      : {
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }),
    "& p": {
      marginBottom: "1rem",
      lineHeight: 1.6,
    },
    "& ul, & ol": {
      paddingLeft: "1.5rem",
      marginBottom: "1rem",
    },
    "& li": {
      marginBottom: "0.5rem",
    },
    "& code": {
      backgroundColor: "#919297",
      color: "#f8f8f2",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "95%",
    },
  })
);

const ChatContainer = styled(Box)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  padding: theme.spacing(3),
  backgroundColor: theme.palette.grey[50],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: Message[];
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
}

interface ChatInterfaceProps {
  conversation?: Conversation;
  onNewConversation: (conversation: Conversation) => void;
}

export function ChatInterface({
  conversation,
  onNewConversation,
}: ChatInterfaceProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(
    conversation?.messages || []
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
 
  const [provider, setProvider] = useState<
    "openai" | "claude" | "gemini" | "deepseek" | "llama"
  >("claude");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
    } else {
      setMessages([]);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId: conversation?.id,
          provider,
          groupId: selectedGroup,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      if (!conversation && data.conversation) {
        onNewConversation(data.conversation);
      }

      setMessages((prev) => [...prev, data.message]);
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Failed to send message. Please try again.", "error");
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: "Sorry, there was an error processing your message.",
          role: "assistant",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("/api/crawler-groups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        } else {
          console.error("Failed to fetch groups");
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchGroups();
  }, []);

  return (
    <ChatContainer>
      {/* Header */}
      <Paper sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {conversation?.title || t("newConversation")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("chatWithAiUsing", {
                provider:
                  provider === "openai"
                    ? t("openaiGpt")
                    : provider === "claude"
                    ? t("anthropicClaude")
                    : provider === "gemini"
                    ? t("googleGemini")
                    : provider === "deepseek"
                    ? t("deepseek")
                    : t("llamaLocal"),
              })}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={3}>
            {/* Group Selector */}
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Select Group :
              </Typography>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  variant="outlined"
                >
                  <MenuItem value="default">Default</MenuItem>

                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>
                      No groups found
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* AI Provider Selector */}
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                {t("aiProvider")}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={provider}
                  onChange={(e) =>
                    setProvider(
                      e.target.value as
                        | "openai"
                        | "claude"
                        | "gemini"
                        | "deepseek"
                        | "llama"
                    )
                  }
                  variant="outlined"
                >
                  <MenuItem value="openai">{t("openaiGpt")}</MenuItem>
                  <MenuItem value="claude">{t("anthropicClaude")}</MenuItem>
                  <MenuItem value="gemini">{t("googleGemini")}</MenuItem>
                  <MenuItem value="deepseek">{t("deepseek")}</MenuItem>
                  <MenuItem value="llama">{t("llamaLocal")}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Messages */}
      <MessagesContainer>
        {messages.length === 0 ? (
          <Box textAlign="center" mt={10}>
            <BotIcon sx={{ fontSize: 80, color: "text.disabled", mb: 3 }} />
            <Typography
              variant="h5"
              fontWeight="bold"
              color="text.secondary"
              gutterBottom
            >
              {t("readyToChat")}
            </Typography>
            <Typography variant="body1" color="text.disabled">
              {t("startConversation")}
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              display="flex"
              gap={2}
              justifyContent={
                message.role === "user" ? "flex-end" : "flex-start"
              }
            >
              {message.role === "assistant" && (
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <BotIcon />
                </Avatar>
              )}

              <MessageBox role={message.role}>
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              borderRadius: 8,
                              fontSize: "14px",
                              padding: "20px",
                              background: "#282c34",
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            style={{
                              backgroundColor: "#919297",
                              color: "#f8f8f2",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "95%",
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      strong({ children }) {
                        return (
                          <strong style={{ color: "#1976d2" }}>
                            {children}
                          </strong>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                  >
                    {message.content}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  color={
                    message.role === "user"
                      ? "primary.contrastText"
                      : "text.secondary"
                  }
                  sx={{ mt: 1, display: "block" }}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </MessageBox>

              {message.role === "user" && (
                <Avatar sx={{ bgcolor: "grey.600" }}>
                  <UserIcon />
                </Avatar>
              )}
            </Box>
          ))
        )}
        {isLoading && (
          <Box display="flex" gap={2} justifyContent="flex-start">
            <Avatar sx={{ bgcolor: "primary.main" }}>
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
      <Paper sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
        
        <Box display="flex" gap={2} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder={t("typeMessage")}
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
            {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
          </Button>
        </Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={1}
        >
          <Typography variant="caption" color="text.secondary">
            {t("aiResponsesDisclaimer")}
          </Typography>
          <Chip
            label={`${inputMessage.length}/2000 characters`}
            size="small"
            color={inputMessage.length > 1000 ? "error" : "default"}
            variant="outlined"
          />
        </Box>
      </Paper>
    </ChatContainer>
  );
}


