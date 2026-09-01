import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/auth/LoginView";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  // 이미 로그인한 상태로 들어오면 선택 화면을 다시 보여주지 않는다
  if (await getCurrentUser()) redirect("/");

  return <LoginView />;
}
