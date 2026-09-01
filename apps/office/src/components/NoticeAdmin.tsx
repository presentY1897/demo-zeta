"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NoticeCategory, NoticeView } from "@theta/db/notices";
import { Button, Card, cn } from "@theta/ui";

const CATEGORY_STYLE: Record<NoticeCategory, string> = {
  공지: "bg-surface-2 text-text-sub",
  업데이트: "bg-primary-soft text-primary",
  이벤트: "bg-accent/15 text-accent",
};

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-text-faint focus:border-primary/60";

/** 작성·고정·삭제는 admin API를 거치고, 목록은 서버(RSC)를 다시 읽어 갱신한다 */
export function NoticeAdmin({ items }: { items: NoticeView[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("공지");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = sending || refreshing;

  /** 실패하면 문구를 남기고 false — 성공하면 목록을 다시 읽는다 */
  async function send(path: string, init: RequestInit): Promise<boolean> {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(path, init);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return false;
      }
      startRefresh(() => router.refresh());
      return true;
    } catch {
      setError("서버에 연결하지 못했어요.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function publish() {
    const ok = await send("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title: title.trim(), body: body.trim() }),
    });
    if (ok) {
      setTitle("");
      setBody("");
    }
  }

  function togglePin(notice: NoticeView) {
    void send(`/api/admin/notices/${notice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !notice.pinned }),
    });
  }

  function remove(notice: NoticeView) {
    if (window.confirm(`"${notice.title}" 공지를 삭제할까요?`)) {
      void send(`/api/admin/notices/${notice.id}`, { method: "DELETE" });
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">공지 관리</h1>
        <p className="mt-1 text-sm text-text-sub">
          게시 {items.length}건 · 작성·고정·삭제가 유저 앱 공지사항에 바로 반영돼요
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-bold">새 공지 작성</h2>
        <div className="flex gap-2">
          <select
            aria-label="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value as NoticeCategory)}
            className="h-11 shrink-0 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-primary/60"
          >
            <option value="공지">공지</option>
            <option value="업데이트">업데이트</option>
            <option value="이벤트">이벤트</option>
          </select>
          <input
            type="text"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
            className={cn(inputClass, "h-11")}
          />
        </div>
        <textarea
          value={body}
          rows={4}
          maxLength={1000}
          onChange={(e) => setBody(e.target.value)}
          placeholder="공지 내용"
          className={cn(inputClass, "resize-none py-2.5 leading-relaxed")}
        />
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={publish} disabled={busy || !title.trim() || !body.trim()}>
            {sending ? "처리 중…" : "게시하기"}
          </Button>
        </div>
      </Card>

      <ul className="space-y-2">
        {items.map((notice) => (
          <li key={notice.id}>
            <Card className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                  CATEGORY_STYLE[notice.category],
                )}
              >
                {notice.category}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug">
                  {notice.pinned && (
                    <span className="mr-1 text-primary" title="고정됨">
                      📌
                    </span>
                  )}
                  {notice.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-text-faint">
                  {notice.body}
                </p>
                <p className="mt-1 text-[11px] text-text-faint">{notice.date}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => togglePin(notice)}
                >
                  {notice.pinned ? "고정 해제" : "고정"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove(notice)}
                >
                  삭제
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="py-16 text-center text-sm text-text-faint">
          아직 게시된 공지가 없어요.
        </p>
      )}
    </div>
  );
}
