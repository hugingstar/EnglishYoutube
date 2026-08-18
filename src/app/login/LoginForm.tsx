"use client";

import { useActionState } from "react";
import { ActionState, login } from "@/app/actions/auth";

const initialState: ActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  // 비밀번호만 틀렸을 때 아이디를 다시 치지 않도록 되살립니다.
  const previous = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">아이디</span>
        <input
          name="username"
          defaultValue={previous.username ?? ""}
          autoComplete="username"
          autoFocus
          required
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-mocha"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">비밀번호</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-mocha"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-mocha px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mocha-dark disabled:opacity-60"
      >
        {pending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
