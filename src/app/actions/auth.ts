"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, deleteSession, getCurrentUser } from "@/lib/session";
import {
  createUser,
  findUserById,
  isEmailTaken,
  isPasswordCorrect,
  isUsernameTaken,
  updatePassword,
  updateProfile,
  verifyCredentials,
} from "@/lib/users";

export interface ActionState {
  error?: string;
  success?: string;
  /**
   * 서버 액션이 끝나면 폼이 초기화되므로, 다시 채워 넣을 값을 함께 돌려줍니다.
   * 비밀번호는 담지 않습니다.
   */
  values?: Record<string, string>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 아이디는 영문·숫자·밑줄만 허용해 URL이나 표시에서 헷갈리지 않게 합니다. */
const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/;

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return {
      error: "아이디와 비밀번호를 모두 입력해 주세요.",
      values: { username },
    };
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return {
      error: "아이디 또는 비밀번호가 올바르지 않아요.",
      values: { username },
    };
  }

  await createSession(user.id);
  // redirect는 예외를 던져 흐름을 끊으므로 반드시 마지막에 호출합니다.
  redirect("/");
}

export async function signup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();

  // 비밀번호를 뺀 입력값. 오류가 나도 다시 타이핑하지 않도록 돌려줍니다.
  const values = { username, nickname, email, goal };
  const fail = (error: string): ActionState => ({ error, values });

  if (!USERNAME_PATTERN.test(username)) {
    return fail("아이디는 영문·숫자·밑줄로 4~20자로 정해 주세요.");
  }
  if (password.length < 4) {
    return fail("비밀번호는 4자 이상으로 정해 주세요.");
  }
  if (password !== confirmPassword) {
    return fail("비밀번호 확인이 일치하지 않아요.");
  }
  if (nickname.length < 2) {
    return fail("닉네임은 2자 이상으로 적어 주세요.");
  }
  if (!EMAIL_PATTERN.test(email)) {
    return fail("이메일 형식이 올바르지 않아요.");
  }
  if (await isUsernameTaken(username)) {
    return fail("이미 쓰고 있는 아이디예요. 다른 아이디를 정해 주세요.");
  }
  if (await isEmailTaken(email, "")) {
    return fail("이미 가입에 쓰인 이메일이에요.");
  }

  const user = await createUser({ username, password, nickname, email, goal });
  if (!user) {
    return fail("가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 가입하면 바로 로그인 상태로 이어 줍니다.
  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}

export async function saveProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) return { error: "로그인이 필요해요." };

  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();

  if (nickname.length < 2) {
    return { error: "닉네임은 2자 이상으로 적어 주세요." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "이메일 형식이 올바르지 않아요." };
  }
  if (await isEmailTaken(email, current.id)) {
    return { error: "이미 다른 계정이 쓰고 있는 이메일이에요." };
  }

  const saved = await updateProfile(current.id, { nickname, email, goal });
  if (!saved) return { error: "저장에 실패했어요. 다시 시도해 주세요." };

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: "개인정보를 저장했어요." };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) return { error: "로그인이 필요해요." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const user = await findUserById(current.id);
  if (!user) return { error: "사용자를 찾을 수 없어요." };

  if (!(await isPasswordCorrect(user, currentPassword))) {
    return { error: "현재 비밀번호가 올바르지 않아요." };
  }
  if (newPassword.length < 4) {
    return { error: "새 비밀번호는 4자 이상으로 정해 주세요." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "새 비밀번호 확인이 일치하지 않아요." };
  }

  const changed = await updatePassword(current.id, newPassword);
  if (!changed) return { error: "변경에 실패했어요. 다시 시도해 주세요." };

  return { success: "비밀번호를 변경했어요." };
}
