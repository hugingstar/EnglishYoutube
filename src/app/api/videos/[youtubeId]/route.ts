import { NextRequest, NextResponse } from "next/server";
import { getVideoData } from "@/lib/youtubeServer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ youtubeId: string }> }
) {
  const { youtubeId } = await params;
  const sourceLang = request.nextUrl.searchParams.get("lang") ?? undefined;

  try {
    const data = await getVideoData(youtubeId, sourceLang);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 502 }
    );
  }
}
