import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "세타 — 상상이 이야기가 되는 곳",
    template: "%s | 세타",
  },
  description:
    "AI 캐릭터와 실시간으로 상호작용하며 나만의 이야기를 만들어가는 인터랙티브 스토리 플랫폼",
};

export const viewport: Viewport = {
  themeColor: "#0b0b12",
  width: "device-width",
  initialScale: 1,
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
      <body className="bg-bg text-text">{children}</body>
    </html>
  );
}
