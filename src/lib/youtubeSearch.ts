/**
 * YouTube Data API v3로 새 영상을 검색합니다. YOUTUBE_API_KEY가 없으면 빈 결과를
 * 돌려줘서(에러를 던지지 않음) 호출하는 쪽에서 큐레이션 목록으로 자연스럽게
 * 폴백할 수 있게 합니다.
 */
import { listCaptionTracks } from "@/lib/youtubeServer";
import { pickRandom } from "@/lib/shuffle";
import { LanguageTab } from "@/lib/types";

const REGION_CODE: Record<LanguageTab, string | undefined> = {
  "en-US": "US",
  "en-GB": "GB",
  ja: "JP",
  zh: undefined,
};

const RELEVANCE_LANG: Record<LanguageTab, string> = {
  "en-US": "en",
  "en-GB": "en",
  ja: "ja",
  zh: "zh",
};

/** 자막 언어를 비교할 때 쓰는 기본 언어 코드 ("en-GB" → "en") */
const WANTED_BASE_LANG: Record<LanguageTab, string> = {
  "en-US": "en",
  "en-GB": "en",
  ja: "ja",
  zh: "zh",
};

export interface TopicQuery {
  key: string;
  labelKo: string;
  /** 섹터마다 검색어 후보를 여러 개 두고 매번 무작위로 하나를 씁니다. */
  query: Record<LanguageTab, string[]>;
}

/**
 * 검색어의 "-단어" 제외 연산자는 YouTube가 강하게 지켜주지 않아서(순위만 살짝
 * 낮추는 정도), 제목에 이 단어가 있으면 결과에서 직접 걸러냅니다. "일본어 자막
 * 있음"만으로는 "일본어로 영어 배우기" 영상도 통과해버리는 걸 막는 용도입니다.
 */
const OFF_TOPIC_TITLE_MARKERS: Partial<Record<LanguageTab, string[]>> = {
  ja: ["英会話", "英語", "English"],
  zh: ["英语", "英語", "English"],
};

export function isOnTopic(title: string, sector: LanguageTab): boolean {
  const markers = OFF_TOPIC_TITLE_MARKERS[sector];
  if (!markers) return true;
  return !markers.some((marker) => title.includes(marker));
}

/**
 * 큐레이션 목록의 상황 카테고리를 검색어로 옮긴 것. 같은 topic이라도 매번 다른
 * 검색어가 뽑히도록 후보를 여러 개 둡니다 — 하나로 고정하면 YouTube가 늘 같은
 * 순위의 결과를 돌려줘서 새로고침해도 같은 영상만 맴돌게 됩니다.
 */
export const TOPIC_QUERIES: TopicQuery[] = [
  {
    key: "cafe",
    labelKo: "카페/레스토랑 주문",
    query: {
      "en-US": [
        "cafe order conversation",
        "restaurant conversation american english",
        "coffee shop small talk",
      ],
      "en-GB": [
        "cafe order conversation british",
        "restaurant conversation british english",
        "british coffee shop chat",
      ],
      ja: ["カフェ 注文", "レストラン 会話", "定食屋 ランチ"],
      zh: ["咖啡店 点餐", "餐厅 对话", "点外卖 日常"],
    },
  },
  {
    key: "work",
    labelKo: "직장/학교 일상 대화",
    query: {
      "en-US": [
        "workplace small talk",
        "office conversation coworkers",
        "college campus day vlog",
      ],
      "en-GB": [
        "workplace small talk british",
        "office conversation uk",
        "uni student day vlog uk",
      ],
      ja: ["職場 日常会話", "会社員 vlog", "大学生 一日"],
      zh: ["职场 日常对话", "上班族 vlog", "大学生 一天"],
    },
  },
  {
    key: "interview",
    labelKo: "길거리 인터뷰",
    query: {
      "en-US": [
        "street interview new york",
        "asking strangers questions",
        "man on the street interview usa",
      ],
      "en-GB": [
        "street interview london",
        "asking strangers questions uk",
        "easy english street interview",
      ],
      ja: ["街頭インタビュー", "街の人に聞いてみた", "渋谷 インタビュー"],
      zh: ["街头采访", "街访 路人", "随机采访 路人"],
    },
  },
  {
    key: "solo",
    labelKo: "혼자 사는 일상",
    query: {
      "en-US": [
        "living alone vlog",
        "day in my life apartment",
        "solo living diaries",
      ],
      "en-GB": [
        "living alone vlog uk",
        "day in my life london flat",
        "solo living diaries uk",
      ],
      ja: ["一人暮らし vlog", "ひとり暮らし 日常", "自炊 一人暮らし"],
      zh: ["一个人生活 vlog", "独居 日常", "租房 生活"],
    },
  },
  {
    key: "grocery",
    labelKo: "장보기·요리",
    query: {
      "en-US": [
        "grocery haul cook with me",
        "grocery shopping vlog",
        "cooking dinner vlog",
      ],
      "en-GB": [
        "grocery haul cook with me uk",
        "supermarket shop vlog uk",
        "cooking dinner vlog british",
      ],
      ja: ["買い物 料理 vlog", "スーパー 買い出し", "作り置き 料理"],
      zh: ["买菜 做饭 vlog", "超市 采购", "家常菜 做饭"],
    },
  },
  {
    key: "routine",
    labelKo: "아침·저녁 루틴",
    query: {
      "en-US": ["morning routine vlog", "night routine vlog", "5am routine"],
      "en-GB": [
        "morning routine vlog uk",
        "night routine vlog uk",
        "productive morning london",
      ],
      ja: ["朝ルーティン", "ナイトルーティン", "早起き 習慣"],
      zh: ["早晨日常", "夜间routine", "早起 习惯"],
    },
  },
  {
    key: "travel",
    labelKo: "여행·동네 산책",
    query: {
      "en-US": ["city walk vlog", "weekend trip vlog", "exploring my city"],
      "en-GB": [
        "city walk vlog uk",
        "weekend trip vlog uk",
        "exploring london vlog",
      ],
      ja: ["散歩 vlog", "日本 旅行 vlog", "街歩き"],
      zh: ["城市漫步 vlog", "周末 出游", "citywalk 城市"],
    },
  },
  {
    key: "money",
    labelKo: "돈·물가 이야기",
    query: {
      "en-US": [
        "salary street interview",
        "cost of living interview",
        "how much do you make street",
      ],
      "en-GB": [
        "salary street interview uk",
        "cost of living uk interview",
        "how much do you earn london",
      ],
      ja: ["お金 街頭インタビュー", "家賃 いくら 街", "節約 生活"],
      zh: ["工资 街头采访", "生活成本 采访", "省钱 生活"],
    },
  },
  {
    key: "hobby",
    labelKo: "취미·운동",
    query: {
      "en-US": ["my hobby vlog", "gym routine vlog", "weekend hobby day"],
      "en-GB": ["my hobby vlog uk", "gym routine vlog uk", "hobby day london"],
      ja: ["趣味 vlog", "ジム 日常", "休日 趣味"],
      zh: ["爱好 vlog", "健身 日常", "周末 爱好"],
    },
  },
  {
    key: "friends",
    labelKo: "친구와 수다",
    query: {
      "en-US": [
        "friends chatting podcast casual",
        "hanging out with friends vlog",
        "casual conversation friends",
      ],
      "en-GB": [
        "friends chatting podcast british",
        "hanging out with friends vlog uk",
        "casual conversation british friends",
      ],
      ja: ["友達 雑談", "女子会 トーク", "友達と おしゃべり"],
      zh: ["朋友 聊天", "闺蜜 谈话", "朋友 日常 聊天"],
    },
  },
  {
    key: "shopping",
    labelKo: "쇼핑·옷 이야기",
    query: {
      "en-US": ["shopping vlog haul", "thrift shopping vlog", "come shopping with me"],
      "en-GB": [
        "shopping vlog haul uk",
        "charity shop haul uk",
        "come shopping with me london",
      ],
      ja: ["買い物 vlog", "古着 購入品", "ショッピング 同行"],
      zh: ["逛街 vlog", "购物 分享", "陪我逛街"],
    },
  },
  {
    key: "home",
    labelKo: "집안일·정리",
    query: {
      "en-US": ["cleaning motivation vlog", "apartment organisation vlog", "reset my apartment"],
      "en-GB": ["cleaning motivation vlog uk", "flat organisation vlog uk", "sunday reset uk"],
      ja: ["掃除 vlog", "片付け ルーティン", "部屋 模様替え"],
      zh: ["打扫 vlog", "收纳 整理", "家务 日常"],
    },
  },
];

export interface SearchResult {
  videoId: string;
  title: string;
}

interface RawSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string };
}

/**
 * relevance만 쓰면 늘 같은 상위 영상이 나옵니다. 정렬 기준도 섞어서 같은
 * 검색어라도 다른 영상이 걸리게 합니다.
 */
const SEARCH_ORDERS = ["relevance", "date", "viewCount"] as const;

export async function searchYouTube(
  query: string,
  sector: LanguageTab
): Promise<SearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "25",
    safeSearch: "strict",
    videoCaption: "closedCaption",
    videoEmbeddable: "true",
    order: pickRandom(SEARCH_ORDERS),
    relevanceLanguage: RELEVANCE_LANG[sector],
  });
  const region = REGION_CODE[sector];
  if (region) params.set("regionCode", region);

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const items: RawSearchItem[] = data?.items ?? [];
  return items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet?.title ?? "",
    }));
}

interface RawVideoStatusItem {
  id?: string;
  status?: { embeddable?: boolean };
}

/**
 * 소유자가 "다른 웹사이트에서 재생 금지"로 막아둔 영상은 여기서 걸러냅니다.
 * 검색에도 videoEmbeddable=true를 주지만, 그건 YouTube가 느슨하게 지켜서
 * 공식 필드(status.embeddable)로 한 번 더 확인합니다.
 */
export async function filterEmbeddable(
  results: SearchResult[]
): Promise<SearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || results.length === 0) return [];

  const params = new URLSearchParams({
    key: apiKey,
    part: "status",
    // videos.list는 한 번에 50개까지 받습니다.
    id: results.slice(0, 50).map((r) => r.videoId).join(","),
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const items: RawVideoStatusItem[] = data?.items ?? [];
  const embeddableIds = new Set(
    items.filter((item) => item.status?.embeddable).map((item) => item.id)
  );

  return results.filter((r) => embeddableIds.has(r.videoId));
}

const baseLang = (code: string) => code.toLowerCase().split("-")[0];

/** 자막 확인은 영상마다 페이지를 한 번씩 받아와야 해서 이만큼만 시도합니다. */
const MAX_CAPTION_CHECKS = 8;

/**
 * 후보를 앞에서부터 확인해, 실제로 그 섹터 언어의 자막이 달려 있는 첫 영상을
 * 찾습니다. videoCaption=closedCaption은 "자막이 있다"만 보장하지 "그 언어"
 * 자막인지는 보장하지 않아서 한 번 더 걸러야 합니다.
 */
export async function findCaptionedVideo(
  candidates: SearchResult[],
  sector: LanguageTab
): Promise<SearchResult | null> {
  const wanted = WANTED_BASE_LANG[sector];
  for (const candidate of candidates.slice(0, MAX_CAPTION_CHECKS)) {
    const tracks = await listCaptionTracks(candidate.videoId);
    if (tracks.some((t) => baseLang(t.languageCode) === wanted)) {
      return candidate;
    }
  }
  return null;
}
