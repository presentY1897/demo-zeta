import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotice, notices } from "@theta/mocks";

export function generateStaticParams() {
  return notices.map((n) => ({ id: n.id }));
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = getNotice(id);
  if (!notice) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="space-y-2 border-b border-line pb-5">
        <p className="text-[12px] font-bold text-primary">{notice.category}</p>
        <h1 className="text-lg font-extrabold leading-snug">{notice.title}</h1>
        <p className="text-[12px] text-text-faint">{notice.date}</p>
      </div>
      <div className="whitespace-pre-line text-[15px] leading-relaxed text-text-sub">
        {notice.body}
      </div>
      <Link
        href="/notices"
        className="inline-block text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
      >
        ← 목록으로
      </Link>
    </div>
  );
}
