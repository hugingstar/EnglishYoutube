"use server";

import {
  addMyVideoId,
  listMyVideoIds,
  mergeMyVideoIds,
  removeMyVideoId,
} from "@/lib/customVideos";
import { getCurrentUser } from "@/lib/session";
import { parseYouTubeId } from "@/lib/youtubeUrl";

/** 한 번에 옮길 수 있는 개수. 예전 목록 이전(import) 요청을 제한합니다. */
const MAX_IMPORT = 50;

/**
 * 로그인하지 않았거나 영상 ID가 이상하면 목록을 바꾸지 않고
 * 현재 목록(없으면 빈 목록)을 그대로 돌려줍니다.
 */
export async function addMyVideo(youtubeId: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const id = parseYouTubeId(youtubeId);
  if (!id) return listMyVideoIds(user.id);
  return addMyVideoId(user.id, id);
}

export async function removeMyVideo(youtubeId: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return removeMyVideoId(user.id, youtubeId);
}

export async function importMyVideos(youtubeIds: string[]): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const ids = youtubeIds
    .slice(0, MAX_IMPORT)
    .map((value) => parseYouTubeId(value))
    .filter((id): id is string => id !== null);

  if (ids.length === 0) return listMyVideoIds(user.id);
  return mergeMyVideoIds(user.id, ids);
}
