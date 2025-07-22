"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useTranslation } from "react-i18next";
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
  Select,
  InputLabel,
  MenuItem,
} from "@mui/material";
import {
  Language as GlobeIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  TravelExplore as BulkCrawlIcon,
} from "@mui/icons-material";
// import AddIcon from "@mui/icons-material/Add";
import { styled } from "@mui/material/styles";
import NextLink from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { LoadingScreen } from "@/components/LoadingSpinner";

// import { set } from "zod";

const CrawlerContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1200,
  margin: "0 auto",
}));

interface User {
  id: string;
  email: string;
  name?: string;
}

interface CrawledPage {
  id: string;
  url: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function CrawlerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxEntries, setMaxEntries] = useState(10);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isBulkCrawling, setIsBulkCrawling] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [crawlSessionId, setCrawlSessionId] = useState<string | null>(null);
  const initialProgress = {
    query: "",
    totalUrls: 0,
    currentIndex: 0,
    currentUrl: "",
    status: "idle",
    successfulCrawls: 0,
    failedCrawls: 0,
    percentage: 0,
    timeElapsed: 0,
  };

  const [bulkCrawlProgress, setBulkCrawlProgress] = useState(initialProgress);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    pageId: string | null;
  }>({
    open: false,
    pageId: null,
  });
  const [crawlDialog, setCrawlDialog] = useState(false);
  const [bulkCrawlDialog, setBulkCrawlDialog] = useState(false);
  const [createGroupDialog, setCreateGroupDialog] = useState(false);
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("Default");

  interface Group {
    id: string;
    name: string;
  }

  // Check authentication on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setIsLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  // Fetch the groups
  const loadGroups = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found.");
      return;
    }
    const response = await fetch("/api/crawler-groups", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setGroups(data);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    try {
      setIsCreatingGroup(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/crawler-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${t("crawler.creategroup.created")}: ${data.group.name}`);
        loadGroups();
      } else {
        setError(data.error || t("crawler.creategroup.error"));
      }
    } catch (err) {
      console.error("Create group failed:", err);
    } finally {
      setIsCreatingGroup(false);
      setCreateGroupDialog(false);
      setGroupName("");
    }
  };

  const loadCrawledPages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError(t("crawler.loginToView"));
        return;
      }

      const response = await fetch("/api/crawl", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setCrawledPages(data.pages || []);
      } else {
        setError(t("crawler.failedToLoad"));
      }
    } catch (error) {
      console.error("Error loading crawled pages:", error);
      setError(t("crawler.failedToLoad"));
    }
  }, [t]);

  // Load crawled pages when authenticated
  useEffect(() => {
    if (!isBulkCrawling && user) {
      loadCrawledPages();
    }
  }, [user, isBulkCrawling, loadCrawledPages]);

  const crawlWebsite = async () => {
    if (!crawlUrl.trim()) return;

    setIsCrawling(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: crawlUrl, group_Id: selectedGroupId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to crawl website");
      }

      const data = await response.json();
      setCrawlUrl("");
      setSuccess(
        `${t("crawler.successfullyCrawled")}: ${data.data.title || crawlUrl}`
      );

      // Refresh the list
      loadCrawledPages();
    } catch (error) {
      console.error("Error crawling website:", error);
      setError(
        error instanceof Error ? error.message : t("crawler.crawlError")
      );
    } finally {
      setIsCrawling(false);
    }
  };

  const searchAndCrawlBulk = async () => {
    if (!searchQuery.trim()) return;

    setIsBulkCrawling(true);
    setError("");
    setSuccess("");
    setBulkCrawlProgress({
      query: searchQuery,
      totalUrls: 0,
      currentIndex: 0,
      currentUrl: t("crawler.startingSearch"),
      status: "searching",
      successfulCrawls: 0,
      failedCrawls: 0,
      percentage: 0,
      timeElapsed: 0,
    });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/search-crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: maxEntries,
          groupId: selectedGroupId || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("crawler.bulkCrawlError"));
      }

      const data = await response.json();
      setCrawlSessionId(data.sessionId);
      setSuccess(t("crawler.bulkCrawlStarted"));
    } catch (error) {
      console.error("Error starting bulk crawl:", error);
      setError(
        error instanceof Error ? error.message : t("crawler.bulkCrawlError")
      );
      setIsBulkCrawling(false);
    }
  };

  const stopBulkCrawl = async () => {
    if (!crawlSessionId) return;

    try {
      const token = localStorage.getItem("token");

      // Fetch final progress before stopping
      const res = await fetch(
        `/api/crawl-progress?sessionId=${crawlSessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const finalProgress = await res.json();
      console.log("finalProgress", finalProgress);

      setBulkCrawlProgress(finalProgress); // Update UI with final snapshot

      // Stop the crawl session on server
      await fetch(`/api/crawl-progress?sessionId=${crawlSessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(t("crawler.bulkCrawlStopped"));

      // Optionally, wait a bit to let user view final numbers
      setTimeout(() => {
        setIsBulkCrawling(false);
        setCrawlSessionId(null);
        setBulkCrawlProgress(initialProgress);
        loadCrawledPages();
      }, 2000); // or even 3000ms
    } catch (error) {
      console.error("Error stopping bulk crawl:", error);
      setError(t("crawler.stopBulkCrawlError"));
    }
  };

  // Effect to poll for bulk crawl progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkProgress = async () => {
      if (!crawlSessionId) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/crawl-progress?sessionId=${crawlSessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const progressData = await response.json();
          setBulkCrawlProgress(progressData);

          if (
            progressData.status === "completed" ||
            progressData.status === "stopped"
          ) {
            setIsBulkCrawling(false);
            setCrawlSessionId(null);
            loadCrawledPages(); // Refresh the list
            if (progressData.status === "completed") {
              setSuccess(t("crawler.bulkCrawlComplete"));
            }
          }
        } else if (response.status === 404) {
          // Session is gone, stop polling
          setIsBulkCrawling(false);
          setCrawlSessionId(null);
          setBulkCrawlProgress(null);
          loadCrawledPages();
          setSuccess(t("crawler.bulkCrawlSessionFinished"));
        }
      } catch (error) {
        console.error("Error fetching crawl progress:", error);
        setError(t("crawler.progressError"));
        setIsBulkCrawling(false); // Stop on error
        setCrawlSessionId(null);
      }
    };

    if (isBulkCrawling && crawlSessionId) {
      interval = setInterval(checkProgress, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isBulkCrawling, crawlSessionId, loadCrawledPages, t]);

  const handleDelete = async () => {
    if (!deleteDialog.pageId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/crawled-data/${deleteDialog.pageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess(t("crawler.pageDeleted"));
        loadCrawledPages();
      } else {
        setError(t("crawler.deleteError"));
      }
    } catch (error) {
      console.error("Error deleting page:", error);
      setError(t("crawler.deleteError"));
    } finally {
      setDeleteDialog({ open: false, pageId: null });
    }
  };

  const openDeleteDialog = (pageId: string) => {
    setDeleteDialog({ open: true, pageId });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, pageId: null });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  const filteredPages = crawledPages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CrawlerContainer>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          {t("crawler.title")}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          component={NextLink}
          href="/"
        >
          {t("crawler.backToChat")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Progress Display for Bulk Crawl */}
      {isBulkCrawling && bulkCrawlProgress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("crawler.bulkCrawl.progress.title")}
            </Typography>
            <Typography variant="body2" gutterBottom>
              {t("crawler.bulkCrawl.progress.crawling", {
                currentUrl: bulkCrawlProgress.currentUrl,
                currentIndex: bulkCrawlProgress.currentIndex,
                totalUrls: bulkCrawlProgress.totalUrls,
              })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={
                Number.isFinite(bulkCrawlProgress.percentage)
                  ? bulkCrawlProgress.percentage
                  : 0
              }
              sx={{ mb: 2 }}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="caption">
                {t("crawler.bulkCrawl.progress.status")}:{" "}
                {bulkCrawlProgress.status}
              </Typography>
              <Typography variant="caption">
                {t("crawler.bulkCrawl.progress.success")}:{" "}
                {bulkCrawlProgress.successfulCrawls}
              </Typography>
              <Typography variant="caption">
                {t("crawler.bulkCrawl.progress.failed")}:{" "}
                {bulkCrawlProgress.failedCrawls}
              </Typography>
              <Typography variant="caption">
                {t("crawler.bulkCrawl.progress.time")}:{" "}
                {Math.round(bulkCrawlProgress.timeElapsed)}s
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                onClick={stopBulkCrawl}
                disabled={!crawlSessionId}
                fullWidth
              >
                {t("crawler.bulkCrawl.stop")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<GlobeIcon />}
          onClick={() => setCrawlDialog(true)}
          disabled={isCrawling || isBulkCrawling}
          size="large"
        >
          {t("crawler.crawl.title")}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<BulkCrawlIcon />}
          onClick={() => setBulkCrawlDialog(true)}
          disabled={isCrawling || isBulkCrawling}
          size="large"
        >
          {t("crawler.bulkCrawl.title")}
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={() => setCreateGroupDialog(true)}
          size="large"
        >
          {t("crawler.creategroup.title")}
        </Button>
      </Box>

      <Card>
        <CardHeader
          title={t("crawler.crawledPages.title")}
          action={
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                variant="outlined"
                size="small"
                label={t("crawler.crawledPages.searchLabel")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("crawler.crawledPages.searchPlaceholder")}
              />
              <IconButton
                onClick={loadCrawledPages}
                title={t("crawler.crawledPages.refresh")}
              >
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
                  <TableCell>{t("crawler.crawledPages.table.title")}</TableCell>
                  <TableCell>{t("crawler.crawledPages.table.url")}</TableCell>
                  <TableCell>
                    {t("crawler.crawledPages.table.crawledAt")}
                  </TableCell>
                  <TableCell align="right">
                    {t("crawler.crawledPages.table.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 300 }}
                        >
                          {page.title || t("crawler.crawledPages.noTitle")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <LaunchIcon fontSize="inherit" />
                          {page.url}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(page.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => openDeleteDialog(page.id)}
                          color="error"
                          title={t("crawler.crawledPages.delete")}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("crawler.crawledPages.noResults")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Single URL Crawl Dialog */}
      <Dialog
        open={crawlDialog}
        onClose={() => setCrawlDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("crawler.crawl.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("crawler.crawl.description")}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            label={t("crawler.crawl.urlLabel")}
            value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)}
            placeholder={t("crawler.crawl.placeholder")}
            disabled={isCrawling || isBulkCrawling}
            sx={{ mt: 1 }}
          />

          <InputLabel sx={{ mt: 2 }}>Group</InputLabel>
          <Select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            sx={{ mt: 1, mx: 0, width: "100%" }}
          >
            <MenuItem value="Default">Default</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrawlDialog(false)} disabled={isCrawling}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              await crawlWebsite();
              setCrawlDialog(false);
            }}
            disabled={isCrawling || isBulkCrawling || !crawlUrl.trim()}
            startIcon={
              isCrawling ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GlobeIcon />
              )
            }
          >
            {isCrawling
              ? t("crawler.crawl.crawling")
              : t("crawler.crawl.crawl")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Crawl Dialog */}
      {/* Bulk Crawl Dialog */}
      <Dialog
        open={bulkCrawlDialog}
        onClose={() => setBulkCrawlDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("crawler.bulkCrawl.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("crawler.bulkCrawl.description")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              label={t("crawler.bulkCrawl.queryLabel")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("crawler.bulkCrawl.placeholder")}
              disabled={isCrawling || isBulkCrawling}
            />
            <TextField
              variant="outlined"
              label={t("crawler.bulkCrawl.maxEntriesLabel")}
              type="number"
              value={maxEntries}
              onChange={(e) =>
                setMaxEntries(
                  Math.max(1, Math.min(50, parseInt(e.target.value) || 10))
                )
              }
              inputProps={{ min: 1, max: 50 }}
              disabled={isCrawling || isBulkCrawling}
              helperText={t("crawler.bulkCrawl.maxEntriesHelper")}
            />

            <InputLabel sx={{ mt: 0 }}>Group</InputLabel>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              sx={{ mt: 0, mx: 0, width: "100%" }}
            >
              <MenuItem value="Default">Default</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkCrawlDialog(false)}
            disabled={isBulkCrawling}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={async () => {
              await searchAndCrawlBulk();
              setBulkCrawlDialog(false);
            }}
            disabled={isCrawling || isBulkCrawling || !searchQuery.trim()}
            startIcon={
              isBulkCrawling ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <BulkCrawlIcon />
              )
            }
          >
            {t("crawler.bulkCrawl.searchAndCrawl")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Dialog */}
      <Dialog
        open={createGroupDialog}
        onClose={() => {
          setCreateGroupDialog(false);
          setGroupName("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("crawler.creategroup.subtitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("crawler.creategroup.description")}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            label={t("crawler.creategroup.queryLabel")}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("crawler.creategroup.placeholder")}
            disabled={isCreatingGroup}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateGroupDialog(false);
              setGroupName("");
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateGroup}
            disabled={isCreatingGroup || !groupName.trim()}
          >
            {t("crawler.creategroup.create")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
        <DialogTitle>{t("crawler.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography>{t("crawler.deleteDialog.content")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>{t("common.cancel")}</Button>
          <Button onClick={handleDelete} color="error">
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </CrawlerContainer>
  );
}
