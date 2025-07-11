import { NextRequest, NextResponse } from "next/server";
import { webCrawler } from "@/lib/crawler";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const crawlSchema = z.object({
  url: z.string().url(),
  group_Id: z.string().optional(),
});

// GET - Fetch all crawled pages for a user
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    // Fetch all crawled pages for the user
    const crawledPages = await prisma.crawledData.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        createdAt: true,
        group: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      pages: crawledPages,
    });
  } catch (error) {
    console.error("Error fetching crawled pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch crawled pages" },
      { status: 500 }
    );
  }
}

// POST - Crawl a new URL
export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    const body = await request.json();
    const { url, group_Id } = crawlSchema.parse(body);

    // Crawl the URL
    const crawlResult = await webCrawler.crawlUrl(url);

    let finalGroupId = group_Id;

    // If no group selected, find or create 'Default' group for the user
    if (!finalGroupId) {
      let defaultGroup = await prisma.crawlerGroup.findFirst({
        where: {
          userId,
          name: "Default",
        },
      });

      // If not exists, create it
      if (!defaultGroup) {
        defaultGroup = await prisma.crawlerGroup.create({
          data: {
            userId,
            name: "Default",
          },
        });
      }

      finalGroupId = defaultGroup.id;
    }

    // Save crawled data
    await webCrawler.saveCrawledData(userId, finalGroupId, crawlResult);

    return NextResponse.json({
      success: true,
      data: {
        url: crawlResult.url,
        title: crawlResult.title,
        contentLength: crawlResult.content.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to crawl URL" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a crawled page
export async function DELETE(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    // Get page ID from query parameters
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("id");

    if (!pageId) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    // Verify the page belongs to the user and delete it
    const deletedPage = await prisma.crawledData.deleteMany({
      where: {
        id: pageId,
        userId: userId,
      },
    });

    if (deletedPage.count === 0) {
      return NextResponse.json(
        { error: "Page not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting crawled page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
