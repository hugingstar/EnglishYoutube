/**
 * "새로고침" 버튼이 누르는 진입점. 큐레이션 목록을 다시 섞는 게 아니라,
 * YouTube에서 실제로 새 영상을 검색해옵니다. API 키가 없거나 검색이 실패하면
 * null을 돌려주고, 호출하는 쪽(app/actions/rotation.ts)이 큐레이션 목록으로
 * 폴백합니다.
 *
 * 어느 단계든 결정적으로 고르면 같은 영상이 같은 순서로 계속 나오기 때문에,
 * topic·검색어·후보 순서를 모두 무작위로 섞습니다.
 */
import { getVideosByLanguage } from "@/data/videos";
import {
  addDiscovered,
  DiscoveredVideo,
  discoveredToVideoMeta,
  listDiscovered,
} from "@/lib/discoveredVideos";
import { pickRandom, shuffle } from "@/lib/shuffle";
import { LanguageTab, VideoMeta } from "@/lib/types";
import {
  filterEmbeddable,
  findCaptionedVideo,
  isOnTopic,
  searchYouTube,
  TOPIC_QUERIES,
  TopicQuery,
} from "@/lib/youtubeSearch";

/** 검색어를 바꿔가며 몇 번까지 다시 시도할지 (첫 topic이 새 영상을 못 건지는 경우) */
const MAX_TOPIC_ATTEMPTS = 3;

/**
 * 최근에 덜 쓴 topic을 우선하되, 최저 횟수가 여럿이면 그중에서 무작위로
 * 고릅니다. 항상 배열 첫 번째를 집으면 topic 순서가 고정돼버립니다.
 */
function pickTopics(recentTopicKeys: string[]): TopicQuery[] {
  const countOf = (topic: TopicQuery) =>
    recentTopicKeys.filter((k) => k === topic.key).length;

  // 같은 사용 횟수끼리 묶어 섞은 뒤, 적게 쓴 그룹부터 이어 붙입니다.
  const byCount = new Map<number, TopicQuery[]>();
  for (const topic of TOPIC_QUERIES) {
    const count = countOf(topic);
    byCount.set(count, [...(byCount.get(count) ?? []), topic]);
  }

  return [...byCount.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, topics]) => shuffle(topics));
}

export async function discoverFreshVideo(
  sector: LanguageTab
): Promise<VideoMeta | null> {
  const curatedIds = new Set(
    getVideosByLanguage(sector).map((v) => v.youtubeId)
  );
  const discovered = await listDiscovered(sector);
  const discoveredIds = new Set(discovered.map((d) => d.videoId));
  const recentTopicKeys = discovered.slice(0, 12).map((d) => d.topicKey);

  const topics = pickTopics(recentTopicKeys);

  for (const topic of topics.slice(0, MAX_TOPIC_ATTEMPTS)) {
    const results = await searchYouTube(pickRandom(topic.query[sector]), sector);

    // 이미 목록에 있거나(큐레이션/이전 발견) 다른 언어 학습용인 건 빼고,
    // 남은 후보는 섞어서 매번 다른 영상이 걸리게 합니다.
    const fresh = shuffle(
      results.filter(
        (r) =>
          !curatedIds.has(r.videoId) &&
          !discoveredIds.has(r.videoId) &&
          isOnTopic(r.title, sector)
      )
    );
    if (fresh.length === 0) continue;

    // 다른 웹사이트 재생을 막아둔 영상은 애초에 후보에서 빼고 시작합니다.
    const embeddable = await filterEmbeddable(fresh);
    if (embeddable.length === 0) continue;

    const match = await findCaptionedVideo(embeddable, sector);
    if (!match) continue;

    const record: DiscoveredVideo = {
      videoId: match.videoId,
      title: match.title,
      topicKey: topic.key,
      topicLabel: topic.labelKo,
      foundAt: new Date().toISOString(),
    };
    await addDiscovered(sector, record);
    return discoveredToVideoMeta(sector, record);
  }

  return null;
}
