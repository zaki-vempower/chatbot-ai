import { NextRequest, NextResponse } from "next/server";
import { webCrawler } from "@/lib/crawler";
import { verifyToken } from "@/lib/auth";

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
