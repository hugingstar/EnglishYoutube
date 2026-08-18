/**
 * 새로고침 버튼으로 YouTube에서 새로 찾아온 영상 이력. 같은 영상을 두 번
 * 찾아오지 않게 걸러내는 용도로만 씁니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LanguageTab, VideoMeta } from "@/lib/types";

const MAX_PER_SECTOR = 100;
const SECTORS: LanguageTab[] = ["en-US", "en-GB", "ja", "zh"];

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "discovered-videos.json");

export interface DiscoveredVideo {
  videoId: string;
  title: string;
  topicKey: string;
  topicLabel: string;
  foundAt: string;
}

type Store = Partial<Record<LanguageTab, DiscoveredVideo[]>>;

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Store;
    }
  } catch {
    // 파일이 없거나 깨졌으면 빈 이력으로 시작합니다.
  }
  return {};
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

/** 최근 것이 앞에 오도록 정렬된 목록. */
export async function listDiscovered(
  sector: LanguageTab
): Promise<DiscoveredVideo[]> {
  return (await readStore())[sector] ?? [];
}

export async function addDiscovered(
  sector: LanguageTab,
  video: DiscoveredVideo
): Promise<void> {
  const store = await readStore();
  const current = store[sector] ?? [];
  if (current.some((v) => v.videoId === video.videoId)) return;

  store[sector] = [video, ...current].slice(0, MAX_PER_SECTOR);
  await writeStore(store);
}

/**
 * 추천 목록에 얹기 위해 큐레이션 영상과 같은 모양(VideoMeta)으로 바꿉니다.
 * 뱃지는 어떤 상황을 찾다가 걸린 영상인지 보이도록 topic 이름을 씁니다
 * ("유튜브에서 새로 찾은 영상"처럼 전부 같은 문구면 구분이 안 됩니다).
 */
export function discoveredToVideoMeta(
  sector: LanguageTab,
  video: DiscoveredVideo
): VideoMeta {
  return {
    id: `disc-${video.videoId}`,
    youtubeId: video.videoId,
    language: sector,
    topic: video.topicLabel,
    reason: `${video.topicLabel} · 새로 찾음`,
  };
}

/** 새로고침으로 찾아온 영상들을 섹터별로 한 번에 가져옵니다. 추천 목록 상단에 얹는 용도. */
export async function listAllDiscovered(): Promise<
  Record<LanguageTab, VideoMeta[]>
> {
  const store = await readStore();
  const result = {} as Record<LanguageTab, VideoMeta[]>;
  for (const sector of SECTORS) {
    result[sector] = (store[sector] ?? []).map((v) =>
      discoveredToVideoMeta(sector, v)
    );
  }
  return result;
}
