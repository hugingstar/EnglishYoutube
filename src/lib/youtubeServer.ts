import { YoutubeTranscript } from "youtube-transcript";

const MAX_LINES = 400;
const TRANSLATE_CONCURRENCY = 8;
/**
 * 번역 자막은 원어 자막보다 약간 늦게 표시되는 경우가 많아,
 * 한국어 줄 기준으로 원어를 모을 때 이만큼 앞당겨 맞춥니다.
 */
const ALIGN_TOLERANCE_MS = 800;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface CaptionTrack {
  languageCode: string;
  label: string;
  /** true면 YouTube 자동 생성(ASR) 자막입니다. */
  auto: boolean;
}

export interface VideoDataResult {
  title: string;
  channel: string;
  sourceLang: string;
  sourceLabel: string;
  /** official = 영상에 포함된 한국어 자막, machine = 기계 번역, none = 번역 없음 */
  translationSource: "official" | "machine" | "none";
  availableLangs: CaptionTrack[];
  transcript: { time: number; original: string; translation: string }[];
}

const metaCache = new Map<string, { title: string; author: string }>();
const trackCache = new Map<string, CaptionTrack[]>();
const dataCache = new Map<string, VideoDataResult>();
const translationCache = new Map<string, string>();

export async function getVideoMeta(videoId: string) {
  const cached = metaCache.get(videoId);
  if (cached) return cached;

  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`
  );
  if (!res.ok) throw new Error("영상을 찾을 수 없어요. URL을 다시 확인해 주세요.");
  const data = await res.json();
  const meta = { title: data.title as string, author: data.author_name as string };
  metaCache.set(videoId, meta);
  return meta;
}

/** 영상 페이지를 파싱해 사용 가능한 자막 트랙 목록을 읽습니다. */
export async function listCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const cached = trackCache.get(videoId);
  if (cached) return cached;

  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
  });
  const html = await res.text();

  const marker = html.split('"captions":');
  if (marker.length < 2) return [];

  let tracks: CaptionTrack[] = [];
  try {
    const parsed = JSON.parse(
      marker[1].split(',"videoDetails"')[0].replace(/\n/g, "")
    );
    const raw = parsed?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    tracks = raw.map((t: Record<string, never>) => ({
      languageCode: t.languageCode as unknown as string,
      label:
        ((t.name as unknown as { simpleText?: string })?.simpleText ??
          (t.name as unknown as { runs?: { text: string }[] })?.runs?.[0]?.text ??
          t.languageCode) as string,
      auto: (t.kind as unknown as string) === "asr",
    }));
  } catch {
    return [];
  }

  trackCache.set(videoId, tracks);
  return tracks;
}

const isKorean = (code: string) => code.toLowerCase().startsWith("ko");

/** "en-US"와 "en", "zh-Hans"와 "zh"처럼 기본 언어가 같으면 같은 언어로 봅니다. */
const baseLang = (code: string) => code.toLowerCase().split("-")[0];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  ko: "한국어",
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[baseLang(code)] ?? code;
}

/** 지역 코드까지 일치 > 수동 자막 > 자동 자막 순으로 점수를 매깁니다. */
function trackScore(track: CaptionTrack, wanted: string): number {
  return (
    (track.auto ? 0 : 2) + (track.languageCode.toLowerCase() === wanted ? 1 : 0)
  );
}

/**
 * 원어 트랙을 고릅니다. 요청 언어가 있으면 반드시 그 언어의 트랙만 씁니다 —
 * 일본어 탭에 (그 영상에 같이 달려 있는) 영어 자막이 뜨면 안 되기 때문입니다.
 * 요청 언어가 없을 때(내 영상 탭)만 수동 자막 > 자동 자막 순으로 고르고,
 * 한국어는 번역용이므로 후순위입니다.
 */
function pickSourceTrack(
  tracks: CaptionTrack[],
  preferred?: string
): CaptionTrack | undefined {
  if (preferred) {
    const wanted = preferred.toLowerCase();
    return tracks
      .filter((t) => baseLang(t.languageCode) === baseLang(wanted))
      .sort((a, b) => trackScore(b, wanted) - trackScore(a, wanted))[0];
  }
  const foreign = tracks.filter((t) => !isKorean(t.languageCode));
  return (
    foreign.find((t) => !t.auto) ?? foreign[0] ?? tracks.find((t) => !t.auto) ?? tracks[0]
  );
}

interface RawLine {
  offset: number;
  text: string;
}

async function fetchTrack(videoId: string, lang: string): Promise<RawLine[]> {
  const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
  return items.map((item) => ({
    offset: item.offset,
    text: cleanText(item.text),
  }));
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^>>\s*/, "")
    .trim();
}

/**
 * 한국어 자막의 문장 단위를 기준으로 원어 자막 조각들을 합칩니다.
 * 자동 생성 자막은 문장 중간에서 잘리기 때문에, 문장 단위 번역본에 맞추면
 * 훨씬 읽기 좋은 대본이 됩니다.
 */
function alignByKorean(source: RawLine[], korean: RawLine[]) {
  return korean.map((koLine, i) => {
    const start = koLine.offset - ALIGN_TOLERANCE_MS;
    const end =
      i + 1 < korean.length
        ? korean[i + 1].offset - ALIGN_TOLERANCE_MS
        : Number.POSITIVE_INFINITY;

    const original = source
      .filter((s) => s.offset >= start && s.offset < end)
      .map((s) => s.text)
      .filter(Boolean)
      .join(" ");

    return {
      time: Math.round(koLine.offset / 1000),
      original,
      translation: koLine.text,
    };
  });
}

async function translateLine(text: string): Promise<string> {
  const cached = translationCache.get(text);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=${encodeURIComponent("autodetect|ko")}`
    );
    if (!res.ok) throw new Error("translate failed");
    const data = await res.json();
    const result: string = data?.responseData?.translatedText || "(번역 준비 중)";
    translationCache.set(text, result);
    return result;
  } catch {
    return "(번역 준비 중)";
  }
}

async function translateAll(lines: RawLine[]): Promise<string[]> {
  const results: string[] = new Array(lines.length);
  let cursor = 0;

  async function worker() {
    while (cursor < lines.length) {
      const i = cursor++;
      results[i] = await translateLine(lines[i].text);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(TRANSLATE_CONCURRENCY, lines.length) }, worker)
  );
  return results;
}

export async function getVideoData(
  videoId: string,
  preferredLang?: string
): Promise<VideoDataResult> {
  const cacheKey = `${videoId}:${preferredLang ?? "auto"}`;
  const cached = dataCache.get(cacheKey);
  if (cached) return cached;

  const [meta, tracks] = await Promise.all([
    getVideoMeta(videoId),
    listCaptionTracks(videoId),
  ]);

  if (tracks.length === 0) {
    throw new Error("이 영상에는 사용할 수 있는 자막이 없어요.");
  }

  const sourceTrack = pickSourceTrack(tracks, preferredLang);
  if (!sourceTrack) {
    throw new Error(
      preferredLang
        ? `이 영상에는 ${languageName(preferredLang)} 자막이 없어요.`
        : "이 영상에는 사용할 수 있는 자막이 없어요."
    );
  }

  const koreanTrack = tracks.find(
    (t) => isKorean(t.languageCode) && t.languageCode !== sourceTrack.languageCode
  );

  const source = await fetchTrack(videoId, sourceTrack.languageCode);

  let transcript: VideoDataResult["transcript"];
  let translationSource: VideoDataResult["translationSource"];

  if (koreanTrack) {
    const korean = await fetchTrack(videoId, koreanTrack.languageCode);
    transcript = alignByKorean(source, korean).slice(0, MAX_LINES);
    translationSource = "official";
  } else if (isKorean(sourceTrack.languageCode)) {
    transcript = source.slice(0, MAX_LINES).map((line) => ({
      time: Math.round(line.offset / 1000),
      original: line.text,
      translation: "",
    }));
    translationSource = "none";
  } else {
    const capped = source.slice(0, MAX_LINES).filter((l) => l.text.length > 0);
    const translations = await translateAll(capped);
    transcript = capped.map((line, i) => ({
      time: Math.round(line.offset / 1000),
      original: line.text,
      translation: translations[i],
    }));
    translationSource = "machine";
  }

  const result: VideoDataResult = {
    title: meta.title,
    channel: meta.author,
    sourceLang: sourceTrack.languageCode,
    sourceLabel: sourceTrack.label,
    translationSource,
    availableLangs: tracks,
    transcript: transcript.filter((line) => line.original || line.translation),
  };

  dataCache.set(cacheKey, result);
  return result;
}
