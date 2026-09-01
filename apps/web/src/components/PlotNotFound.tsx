import Link from "next/link";

/** 삭제됐거나 볼 권한이 없는 플롯 안내 */
export function PlotNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-24 text-center">
      <span className="text-4xl" aria-hidden>
        🔍
      </span>
      <p className="text-sm text-text-sub">
        플롯을 찾을 수 없어요.
        <br />
        삭제됐거나 비공개 플롯이에요.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
