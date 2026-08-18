"use server";

import { discoverFreshVideo } from "@/lib/discovery";
import { recordFeaturedPick, refreshFeatured } from "@/lib/rotation";
import { getCurrentUser } from "@/lib/session";
import { LanguageTab, VideoMeta } from "@/lib/types";

/**
 * 로그인한 사용자만 새로고침을 누를 수 있습니다. 먼저 YouTube에서 실제로
 * 새 영상을 찾아보고, API 키가 없거나 조건에 맞는 영상을 못 찾으면 큐레이션
 * 목록 안에서라도 다른 영상으로 바꿔줍니다.
 */
export async function refreshFeaturedVideo(
  sector: LanguageTab
): Promise<VideoMeta | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const discovered = await discoverFreshVideo(sector).catch(() => null);
  if (discovered) {
    // 이번 시간대의 픽으로 남겨야 페이지를 새로고침해도 이 영상이 유지됩니다.
    await recordFeaturedPick(sector, discovered);
    return discovered;
  }

  return refreshFeatured(sector);
}
