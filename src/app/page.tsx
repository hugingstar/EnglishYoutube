import { redirect } from "next/navigation";
import HomeView from "@/components/HomeView";
import { getVideosByLanguage } from "@/data/videos";
import { listMyVideoIds } from "@/lib/customVideos";
import { listAllDiscovered } from "@/lib/discoveredVideos";
import { getFeaturedVideos } from "@/lib/rotation";
import { getCurrentUser } from "@/lib/session";
import { shuffle } from "@/lib/shuffle";
import { LanguageTab, LANGUAGE_TABS, VideoMeta } from "@/lib/types";
import { historyEntryToVideoMeta, listWatchHistory } from "@/lib/watchHistory";

export default async function Home() {
  // 세션은 서버에서만 읽고, 화면에 필요한 정보만 클라이언트로 내려줍니다.
  const user = await getCurrentUser();
  // 둘러보기 없이 로그인한 사람만 이용합니다.
  if (!user) redirect("/login");

  const [customVideoIds, discovered, historyEntries] = await Promise.all([
    listMyVideoIds(user.id),
    listAllDiscovered(),
    listWatchHistory(user.id),
  ]);
  // 찾아온 영상까지 넘겨야 마지막 픽이 발견 영상일 때도 그대로 복원됩니다.
  const featured = await getFeaturedVideos(discovered);

  // 목록 순서를 매번 섞습니다. 고정 순서면 접속할 때마다 같은 영상만 위에 뜹니다.
  const curated = {} as Record<LanguageTab, VideoMeta[]>;
  for (const sector of LANGUAGE_TABS) {
    curated[sector] = shuffle(getVideosByLanguage(sector));
  }

  return (
    <HomeView
      user={user}
      initialCustomVideoIds={customVideoIds}
      featured={featured}
      discovered={discovered}
      curated={curated}
      initialHistory={historyEntries.map(historyEntryToVideoMeta)}
    />
  );
}
