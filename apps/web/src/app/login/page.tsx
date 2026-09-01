import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/auth/LoginView";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // 이미 로그인한 상태로 들어오면 선택 화면을 다시 보여주지 않는다
  if (await getCurrentUser()) redirect("/");

  const { error } = await searchParams;
  // 키가 없으면 구글 버튼 자체를 렌더하지 않는다 — 키 없는 로컬 실행도 완전 동작
  return <LoginView googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)} initialError={error} />;
}
