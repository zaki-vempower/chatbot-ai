import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const newGroup = await prisma.crawlerGroup.create({
      data: {
        name,
        userId,
      },
    });

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { userId } = verifyToken(token);

    const groups = await prisma.crawlerGroup.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json(
      { error: "Failed to get groups" },
      { status: 500 }
    );
  }
}
