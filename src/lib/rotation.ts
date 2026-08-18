/**
 * 섹터별 "이번 시간의 추천 영상"을 고르는 모듈.
 *
 * 외부 트렌드 API 없이(중국은 YouTube 지역 트렌딩 자체가 없음), 최근 노출 이력을
 * Graph RAG의 TrendSignal 대신으로 씁니다 — 최근 덜 나온 topic/영상일수록 이번
 * 시간에 뽑힐 점수(heat)가 올라갑니다. 그래프는 videos.ts에 이미 있는
 * Video–Topic 관계를 그대로 씁니다.
 *
 * "다음 접속 시 반영" 방식이라 별도 스케줄러가 필요 없습니다 — 요청이 들어올 때
 * 현재 시간 버킷(hourKey)과 마지막으로 계산한 버킷을 비교해서, 바뀌었으면 그때
 * 다시 뽑습니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getVideosByLanguage } from "@/data/videos";
import { LanguageTab, VideoMeta } from "@/lib/types";

const SECTORS: LanguageTab[] = ["en-US", "en-GB", "ja", "zh"];
/** 노출 빈도를 계산할 때 참고하는 최근 시간 개수 */
const HISTORY_WINDOW = 6;

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rotation.json");

interface RotationPick {
  hourKey: string;
  videoId: string;
  topic: string;
}

type RotationStore = Partial<Record<LanguageTab, RotationPick[]>>;

/** UTC 기준 시간 버킷. 예: "2026-08-18T09" */
function hourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

async function readStore(): Promise<RotationStore> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as RotationStore;
    }
  } catch {
    // 파일이 없거나 깨졌으면 빈 이력으로 시작합니다.
  }
  return {};
}

async function writeStore(store: RotationStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

/**
 * topic별 최근 노출 횟수가 적을수록, 아예 안 나온 영상일수록 점수가 높습니다.
 * 최근에 보여준 영상들은 (풀이 허용하는 한도 내에서) 후보에서 아예 빼서,
 * 자동이든 수동 새로고침이든 같은 영상이 계속 맴도는 걸 막습니다.
 */
function pickFeatured(pool: VideoMeta[], history: RotationPick[]): VideoMeta {
  if (pool.length <= 1) return pool[0];

  const topicExposure = new Map<string, number>();
  for (const h of history) {
    topicExposure.set(h.topic, (topicExposure.get(h.topic) ?? 0) + 1);
  }

  const excludeCount = Math.min(HISTORY_WINDOW, pool.length - 1);
  const recentlyShown = new Set(
    history.slice(-excludeCount).map((h) => h.videoId)
  );
  const candidates = pool.filter((v) => !recentlyShown.has(v.youtubeId));
  const searchPool = candidates.length > 0 ? candidates : pool;

  let best: VideoMeta | null = null;
  let bestScore = -Infinity;
  for (const video of searchPool) {
    const exposure = topicExposure.get(video.topic) ?? 0;
    const neverShownBonus = recentlyShown.has(video.youtubeId) ? 0 : 0.2;
    const score = 1 / (exposure + 1) + neverShownBonus + Math.random() * 0.05;

    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return best ?? pool[0];
}

/**
 * 4개 섹터 전부의 이번 시간 추천 영상을 가져옵니다. 파일을 한 번만 읽고 한 번만
 * 써서 섹터별로 따로 읽고 쓰다가 파일이 깨지는 경합을 피합니다.
 *
 * 새로고침으로 찾아온 영상(discoveredBySector)도 조회 대상에 넣습니다 —
 * 그게 없으면 마지막 픽이 발견 영상일 때 못 찾아서, 페이지를 새로고침할 때마다
 * 큐레이션 영상으로 되돌아가 버립니다.
 */
export async function getFeaturedVideos(
  discoveredBySector: Partial<Record<LanguageTab, VideoMeta[]>> = {}
): Promise<Record<LanguageTab, VideoMeta>> {
  const key = hourKey();
  const store = await readStore();
  let changed = false;

  const result = {} as Record<LanguageTab, VideoMeta>;
  for (const sector of SECTORS) {
    const curated = getVideosByLanguage(sector);
    const lookup = [...(discoveredBySector[sector] ?? []), ...curated];
    const history = store[sector] ?? [];
    const last = history[history.length - 1];
    const cached =
      last?.hourKey === key
        ? lookup.find((v) => v.youtubeId === last.videoId)
        : undefined;

    if (cached) {
      result[sector] = cached;
      continue;
    }

    const picked = pickFeatured(curated, history);
    result[sector] = picked;
    store[sector] = [
      ...history,
      { hourKey: key, videoId: picked.youtubeId, topic: picked.topic },
    ].slice(-HISTORY_WINDOW);
    changed = true;
  }

  if (changed) await writeStore(store);
  return result;
}

/** 이번 시간대의 픽으로 기록합니다. 페이지를 새로고침해도 이 영상이 그대로 뜹니다. */
export async function recordFeaturedPick(
  sector: LanguageTab,
  video: VideoMeta
): Promise<void> {
  const store = await readStore();
  store[sector] = [
    ...(store[sector] ?? []),
    { hourKey: hourKey(), videoId: video.youtubeId, topic: video.topic },
  ].slice(-HISTORY_WINDOW);
  await writeStore(store);
}

/**
 * 사용자가 새로고침 버튼을 눌렀을 때, 시간이 안 바뀌었어도 그 섹터만 즉시
 * 새로 뽑습니다. 이번 시간대의 픽으로 그대로 기록되므로, 이후 자동 새로고침도
 * 이 결과를 이어받습니다.
 */
export async function refreshFeatured(sector: LanguageTab): Promise<VideoMeta> {
  const pool = getVideosByLanguage(sector);
  const store = await readStore();
  const history = store[sector] ?? [];

  const picked = pickFeatured(pool, history);
  store[sector] = [
    ...history,
    { hourKey: hourKey(), videoId: picked.youtubeId, topic: picked.topic },
  ].slice(-HISTORY_WINDOW);

  await writeStore(store);
  return picked;
}
