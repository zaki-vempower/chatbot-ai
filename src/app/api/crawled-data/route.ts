import { NextRequest, NextResponse } from "next/server";
import { webCrawler } from "@/lib/crawler";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get crawled data summary and context
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "summary";

    if (action === "summary") {
      // Get summary statistics
      const summary = await webCrawler.getCrawledDataSummary(userId);
      return NextResponse.json({
        success: true,
        summary,
      });
    } else if (action === "context") {
      // Get all crawled data as context
      const maxItems = parseInt(searchParams.get("maxItems") || "10");
      const context = await webCrawler.getAllCrawledDataAsContext(
        userId,
        maxItems
      );

      return NextResponse.json({
        success: true,
        context,
        isEmpty: !context,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use summary or context" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error getting crawled data info:", error);
    return NextResponse.json(
      { error: "Failed to get crawled data information" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    const pageId = params.id;

    // Check if the page exists and belongs to the user
    const page = await prisma.crawledData.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (page.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the page
    await prisma.crawledData.delete({
      where: { id: pageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting crawled page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
