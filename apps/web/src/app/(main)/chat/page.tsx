import Link from "next/link";

export const metadata = { title: "대화" };

/** 대화 목록 — 대화 기록 저장은 채팅 구현 단계에서 붙는다 */
export default function ChatListPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-extrabold">대화</h1>
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface py-16 text-center">
        <span className="text-4xl" aria-hidden>
          💬
        </span>
        <p className="text-sm text-text-sub">아직 시작한 대화가 없어요.</p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          마음에 드는 캐릭터 찾아보기
        </Link>
      </div>
    </div>
  );
}
