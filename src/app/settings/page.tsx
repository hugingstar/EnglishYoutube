import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "./SettingsForms";
import SparrowLogo from "@/components/SparrowLogo";
import UserMenu from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "설정 — 톡참새",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  // 로그인하지 않았다면 설정 화면을 열어 줄 이유가 없습니다.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <SparrowLogo className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">톡참새</span>
        </Link>
        <div className="ml-auto">
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4">
        <h1 className="text-xl font-bold text-foreground">설정</h1>
        <p className="mt-1 text-sm text-muted">
          닉네임·이메일·비밀번호를 바꿀 수 있어요.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-foreground">개인정보</h2>
          <ProfileForm user={user} />
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-foreground">비밀번호 변경</h2>
          <PasswordForm />
        </section>

        <Link
          href="/"
          className="mt-5 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          ← 영상 보러 가기
        </Link>
      </main>
    </div>
  );
}
