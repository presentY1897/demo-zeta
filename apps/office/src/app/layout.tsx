import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: {
    default: "세타 오피스",
    template: "%s | 세타 오피스",
  },
  description: "세타 운영 오피스 — 지표, 유저, 비용 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-bg text-text">
        <div className="flex min-h-dvh">
          <Sidebar />
          <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
