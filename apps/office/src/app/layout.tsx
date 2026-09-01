import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AdminLogin } from "@/components/auth/AdminLogin";
import { isAdminAuthenticated } from "@/server/admin-session";

export const metadata: Metadata = {
  title: {
    default: "세타 오피스",
    template: "%s | 세타 오피스",
  },
  description: "세타 운영 오피스 — 지표, 유저, 비용 관리",
};

/**
 * 오피스 전체를 admin 비밀번호로 잠근다 — 미인증이면 어떤 라우트든 로그인 화면만 렌더한다.
 * (Next 미들웨어는 edge 런타임이라 DB·Node crypto를 쓸 수 없어 레이아웃 가드로 처리한다)
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAdminAuthenticated();

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-bg text-text">
        {authenticated ? (
          <div className="flex min-h-dvh">
            <Sidebar />
            <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">{children}</main>
          </div>
        ) : (
          <AdminLogin />
        )}
      </body>
    </html>
  );
}
