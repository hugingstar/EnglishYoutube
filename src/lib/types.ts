export type LanguageTab = "en-US" | "en-GB" | "ja" | "zh";

export interface TranscriptLine {
  /** Seconds from video start */
  time: number;
  original: string;
  translation: string;
}

export interface CaptionTrack {
  languageCode: string;
  label: string;
  auto: boolean;
}

/** 큐레이션 목록 또는 사용자가 직접 추가한 영상. 제목/대본은 실시간 조회합니다. */
export interface VideoMeta {
  id: string;
  youtubeId: string;
  /** 요청할 자막 언어 코드. 비우면 탭 언어(TAB_CAPTION_LANG)를 따릅니다. */
  sourceLang?: string;
  language: LanguageTab | "custom";
  topic: string;
  reason: string;
}

export interface VideoDetail {
  title: string;
  channel: string;
  sourceLang: string;
  sourceLabel: string;
  translationSource: "official" | "machine" | "none";
  availableLangs: CaptionTrack[];
  transcript: TranscriptLine[];
}

/** 언어 섹터 4개. 탭 순서이자 서버에서 섹터별로 훑을 때 쓰는 목록입니다. */
export const LANGUAGE_TABS: LanguageTab[] = ["en-US", "en-GB", "ja", "zh"];

export type TabKey = LanguageTab | "custom" | "history";

export const LANGUAGE_LABELS: Record<TabKey, string> = {
  "en-US": "영어 (미국)",
  "en-GB": "영어 (영국)",
  ja: "일본어",
  zh: "중국어",
  custom: "내 영상",
  history: "시청 이력",
};

/** 탭 버튼에 쓰는 짧은 라벨 (가로 폭이 좁아 전체 라벨은 넘칩니다) */
export const TAB_LABELS: Record<TabKey, string> = {
  "en-US": "미국",
  "en-GB": "영국",
  ja: "일본어",
  zh: "중국어",
  custom: "내 영상",
  history: "이력",
};

export const TRANSLATION_SOURCE_LABELS: Record<
  VideoDetail["translationSource"],
  string
> = {
  official: "공식 한국어 자막",
  machine: "자동 번역",
  none: "번역 없음",
};

/**
 * 탭마다 반드시 이 언어의 자막을 씁니다. 미국·영국 탭은 영어 자막,
 * 일본어 탭은 일본어 자막, 중국어 탭은 중국어 자막입니다.
 * 지역 코드가 없는 트랙(en, zh)도 같은 언어로 인정됩니다.
 */
export const TAB_CAPTION_LANG: Record<LanguageTab, string> = {
  "en-US": "en-US",
  "en-GB": "en-GB",
  ja: "ja",
  zh: "zh",
};

/**
 * 서버에 요청할 자막 언어 코드. 영상에 직접 지정한 값이 우선이고,
 * 없으면 탭 언어를 따릅니다. 내 영상 탭은 언어를 알 수 없어 서버 자동 선택에 맡깁니다.
 */
export function captionLangFor(meta: VideoMeta): string | undefined {
  if (meta.sourceLang) return meta.sourceLang;
  return meta.language === "custom" ? undefined : TAB_CAPTION_LANG[meta.language];
}
