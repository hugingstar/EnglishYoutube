import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import SparrowLogo from "@/components/SparrowLogo";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "로그인 — 톡참새",
};

export default async function LoginPage() {
  // 이미 로그인했다면 로그인 화면을 보여줄 필요가 없습니다.
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <SparrowLogo className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">톡참새</span>
        </Link>

        <h1 className="mt-5 text-xl font-bold text-foreground">로그인</h1>
        <p className="mt-1 mb-5 text-sm text-muted">
          로그인하면 추천 영상과 내가 추가한 영상을 볼 수 있어요.
        </p>

        <LoginForm />

        <p className="mt-5 text-center text-xs text-muted">
          아직 계정이 없나요?{" "}
          <Link
            href="/signup"
            className="font-semibold text-mocha-dark transition-colors hover:text-foreground"
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
