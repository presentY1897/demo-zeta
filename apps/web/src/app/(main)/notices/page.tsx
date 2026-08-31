import Link from "next/link";
import { notices } from "@theta/mocks";
import { cn } from "@theta/ui";

export const metadata = { title: "공지사항" };

const CATEGORY_STYLE: Record<string, string> = {
  공지: "bg-surface-2 text-text-sub",
  업데이트: "bg-primary-soft text-primary",
  이벤트: "bg-accent/15 text-accent",
};

export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-extrabold">공지사항</h1>
      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link
              href={`/notices/${notice.id}`}
              className="block space-y-1.5 p-4 transition-colors hover:bg-surface-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                    CATEGORY_STYLE[notice.category],
                  )}
                >
                  {notice.category}
                </span>
                {notice.pinned && (
                  <span className="text-[11px] font-semibold text-primary">
                    고정됨
                  </span>
                )}
              </div>
              <p className="text-[15px] font-semibold leading-snug">
                {notice.title}
              </p>
              <p className="text-[12px] text-text-faint">{notice.date}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
