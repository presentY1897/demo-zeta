import Link from "next/link";

/** 존재하지 않거나 이 브라우저에 없는 플롯 안내 */
export function PlotNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-24 text-center">
      <span className="text-4xl" aria-hidden>
        🔍
      </span>
      <p className="text-sm text-text-sub">
        플롯을 찾을 수 없어요.
        <br />
        삭제됐거나 다른 브라우저에서 만든 플롯일 수 있어요.
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
