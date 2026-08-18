import { NextRequest, NextResponse } from "next/server";
import { getVideoMeta } from "@/lib/youtubeServer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ youtubeId: string }> }
) {
  const { youtubeId } = await params;
  try {
    const meta = await getVideoMeta(youtubeId);
    return NextResponse.json(meta);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
