import { parse } from "node-html-parser";
import { prisma } from "./prisma";

export interface CrawlResult {
  url: string;
  title?: string;
  content: string;
}

export class WebCrawler {
  async crawlUrl(url: string): Promise<CrawlResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout at fetch level

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.google.com",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const root = parse(html);

      // Extract title
      const title =
        root.querySelector("title")?.text?.trim() ||
        root.querySelector("h1")?.text?.trim() ||
        "Untitled";

      // Remove script and style elements
      root
        .querySelectorAll("script, style, nav, footer, header")
        .forEach((el) => el.remove());

      // Extract main content
      let content = "";

      // Try to find main content areas
      const mainSelectors = [
        "main",
        '[role="main"]',
        ".main-content",
        ".content",
        "article",
        ".post-content",
        ".entry-content",
        ".article-content",
      ];

      let mainContent = null;
      for (const selector of mainSelectors) {
        mainContent = root.querySelector(selector);
        if (mainContent) break;
      }

      if (mainContent) {
        content = mainContent.text;
      } else {
        // Fallback: extract text from body, excluding unwanted elements
        const body = root.querySelector("body");
        if (body) {
          content = body.text;
        }
      }

      // Clean up the content
      content = content
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim()
        .substring(0, 10000); // Limit content length

      return {
        url,
        title,
        content,
      };
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      throw new Error(
        `Failed to crawl ${url}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async saveCrawledData(
    userId: string,
    groupId: string | undefined,
    crawlResult: CrawlResult
  ): Promise<void> {
    try {
      await prisma.crawledData.upsert({
        where: {
          url_userId: {
            url: crawlResult.url,
            userId: userId,
          },
        },
        update: {
          title: crawlResult.title,
          content: crawlResult.content,
          groupId: groupId || null,
          updatedAt: new Date(),
        },
        create: {
          url: crawlResult.url,
          title: crawlResult.title,
          content: crawlResult.content,
          userId: userId,
          groupId: groupId || null,
        },
      });
    } catch (error) {
      console.error("Error saving crawled data:", error);
      throw new Error("Failed to save crawled data");
    }
  }

  async searchCrawledData(userId: string, query: string): Promise<string> {
    try {
      const crawledData = await prisma.crawledData.findMany({
        where: {
          userId: userId,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });

      if (crawledData.length === 0) {
        return "";
      }

      return crawledData
        .map(
          (data) =>
            `From ${data.title} (${data.url}):\n${data.content.substring(
              0,
              500
            )}...`
        )
        .join("\n\n");
    } catch (error) {
      console.error("Error searching crawled data:", error);
      return "";
    }
  }

  async getAllCrawledDataAsContext(
    userId: string,
    maxItems: number = 10
  ): Promise<string> {
    try {
      const crawledData = await prisma.crawledData.findMany({
        where: {
          userId: userId,
        },
        orderBy: { updatedAt: "desc" },
        take: maxItems,
        select: {
          title: true,
          url: true,
          content: true,
          createdAt: true,
        },
      });

      if (crawledData.length === 0) {
        return "";
      }

      return crawledData
        .map((data) => {
          const date = new Date(data.createdAt).toLocaleDateString();
          return `📄 ${data.title} (${date})
🔗 Source: ${data.url}
📝 Content: ${data.content.substring(0, 800)}...
---`;
        })
        .join("\n\n");
    } catch (error) {
      console.error("Error getting all crawled data:", error);
      return "";
    }
  }

  async getCrawledDataSummary(userId: string): Promise<{
    totalPages: number;
    recentPages: Array<{
      title: string;
      url: string;
      date: string;
    }>;
    topDomains: Array<{
      domain: string;
      count: number;
    }>;
  }> {
    try {
      // Get total count
      const totalCount = await prisma.crawledData.count({
        where: { userId },
      });

      // Get recent pages
      const recentPages = await prisma.crawledData.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          title: true,
          url: true,
          createdAt: true,
        },
      });

      // Get domain statistics
      const allPages = await prisma.crawledData.findMany({
        where: { userId },
        select: { url: true },
      });

      const domainCounts = new Map<string, number>();
      allPages.forEach((page) => {
        try {
          const domain = new URL(page.url).hostname;
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        } catch {
          // Skip invalid URLs
        }
      });

      const topDomains = Array.from(domainCounts.entries())
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalPages: totalCount,
        recentPages: recentPages.map((page) => ({
          title: page.title || "Untitled",
          url: page.url,
          date: new Date(page.createdAt).toLocaleDateString(),
        })),
        topDomains,
      };
    } catch (error) {
      console.error("Error getting crawled data summary:", error);
      return {
        totalPages: 0,
        recentPages: [],
        topDomains: [],
      };
    }
  }
}

export const webCrawler = new WebCrawler();
