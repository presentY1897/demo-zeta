"use client";

import { useId, useState } from "react";
import { cn } from "@theta/ui";
import { prepareCoverImage, releaseCover, type PreparedCover } from "@/lib/cover-image";
import { COVER_CONTENT_TYPES, formatBytes } from "@/lib/cover-limits";

/**
 * 커버 이미지 첨부(선택). 고른 파일은 브라우저에서 4:3으로 잘리고 800×600 webp로 다시
 * 인코딩된 뒤에야 상태에 담긴다 — 여기서 실패하는 파일(확장자만 이미지인 텍스트 등)은
 * 업로드까지 가지도 않고 사용자에게 바로 이유가 보인다.
 */
export function CoverImageField({
  cover,
  onChange,
}: {
  cover: PreparedCover | null;
  onChange: (cover: PreparedCover | null) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await prepareCoverImage(file);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      releaseCover(cover);
      onChange(result.cover);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    releaseCover(cover);
    onChange(null);
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-text-sub">
          커버 이미지 (선택)
        </label>
        {cover && (
          <button
            type="button"
            onClick={remove}
            className="text-[12px] text-text-faint underline underline-offset-4 hover:text-danger"
          >
            제거
          </button>
        )}
      </div>

      <div className="relative max-w-[220px]">
        <input
          id={id}
          type="file"
          accept={COVER_CONTENT_TYPES.join(",")}
          disabled={busy}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            // 같은 파일을 다시 골라도 change가 오도록 비운다
            e.target.value = "";
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className={cn(
            "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card border transition-colors",
            cover ? "border-line" : "border-dashed border-line bg-surface hover:border-primary/60",
          )}
        >
          {cover ? (
            <img
              src={cover.previewUrl}
              alt="커버 이미지 미리보기"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="px-3 text-center">
              <span className="text-2xl" aria-hidden>
                🖼️
              </span>
              <p className="mt-1 text-[12px] font-semibold text-text-sub">
                {busy ? "사진 줄이는 중…" : "사진 올리기"}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[12px] text-text-faint">
        {cover
          ? `${cover.width}×${cover.height} · ${formatBytes(cover.blob.size)}로 줄여서 올려요.`
          : "안 올리면 아래 이모지와 색상이 커버로 쓰여요."}
      </p>

      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
