"use server";

import { getCurrentUser } from "@/lib/session";
import { VideoMeta } from "@/lib/types";
import { recordWatched } from "@/lib/watchHistory";

/** 로그인하지 않았으면 조용히 무시합니다 (둘러보기 없이 로그인해야만 화면이 열려서 실제로는 항상 로그인 상태입니다). */
export async function recordWatchedVideo(video: VideoMeta): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await recordWatched(user.id, video);
}
