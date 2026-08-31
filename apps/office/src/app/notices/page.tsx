"use client";

import { useState } from "react";
import { notices as seedNotices, TODAY, isoDate, type Notice } from "@theta/mocks";
import { Button, Card, cn } from "@theta/ui";

const CATEGORY_STYLE: Record<Notice["category"], string> = {
  공지: "bg-surface-2 text-text-sub",
  업데이트: "bg-primary-soft text-primary",
  이벤트: "bg-accent/15 text-accent",
};

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-text-faint focus:border-primary/60";

export default function NoticeAdminPage() {
  const [items, setItems] = useState<Notice[]>(seedNotices);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Notice["category"]>("공지");
  const [body, setBody] = useState("");

  function publish() {
    if (!title.trim() || !body.trim()) return;
    const notice: Notice = {
      id: `local-${Date.now()}`,
      category,
      title: title.trim(),
      body: body.trim(),
      date: isoDate(TODAY),
    };
    setItems((prev) => [notice, ...prev]);
    setTitle("");
    setBody("");
  }

  function togglePin(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    );
  }

  function remove(id: string, noticeTitle: string) {
    if (window.confirm(`"${noticeTitle}" 공지를 삭제할까요?`)) {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">공지 관리</h1>
        <p className="mt-1 text-sm text-text-sub">
          게시 {items.length}건 · 데모: 작성/변경은 이 세션에만 반영돼요 (실서비스라면
          API로 유저 앱에 반영)
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-bold">새 공지 작성</h2>
        <div className="flex gap-2">
          <select
            aria-label="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value as Notice["category"])}
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
        <div className="flex justify-end">
          <Button onClick={publish} disabled={!title.trim() || !body.trim()}>
            게시하기
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
                  onClick={() => togglePin(notice.id)}
                >
                  {notice.pinned ? "고정 해제" : "고정"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(notice.id, notice.title)}
                >
                  삭제
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
