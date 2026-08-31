"use client";

import { useRef, useState } from "react";

/** 하단 입력창 — Enter 전송, Shift+Enter 줄바꿈, 스트리밍 중엔 중단 버튼 */
export function Composer({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setText("");
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  return (
    <div className="shrink-0 border-t border-line bg-bg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-primary/60">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="메시지를 입력하세요 (*지문*도 쓸 수 있어요)"
          onChange={(e) => {
            setText(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-32 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed outline-none placeholder:text-text-faint"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="응답 중단"
            title="응답 중단"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text transition-colors hover:bg-line"
          >
            <span className="block size-3 rounded-[3px] bg-current" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="전송"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-strong disabled:bg-surface-2 disabled:text-text-faint"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
              aria-hidden
            >
              <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
