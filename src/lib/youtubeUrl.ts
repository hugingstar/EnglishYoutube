/** YouTube 영상 ID는 11자리입니다. */
const ID_PATTERN = /^[\w-]{11}$/;

/**
 * 사용자가 붙여넣은 문자열에서 YouTube 영상 ID를 추출합니다.
 * youtu.be/ID, /watch?v=ID, /embed/ID, /shorts/ID, /live/ID 및 ID 자체를 지원하며
 * ?si=, &t= 같은 부가 파라미터는 무시합니다.
 */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID_PATTERN.test(v)) return v;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 2 && ["embed", "shorts", "live", "v"].includes(segments[0])) {
      return ID_PATTERN.test(segments[1]) ? segments[1] : null;
    }
  }

  return null;
}
