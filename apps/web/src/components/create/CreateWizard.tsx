"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Chip, cn } from "@theta/ui";
import type { PublicUser } from "@/server/auth/http";
import type { PlotView } from "@/lib/plot-view";
import { RoleplayContent } from "@/components/chat/MessageBubble";
import { PlotCard } from "@/components/PlotCard";
import {
  emptyDraft,
  EMOJIS,
  GRADIENTS,
  LIMITS,
  MAX_TAGS,
  TAG_POOL,
  validateStep,
  type PlotDraft,
} from "./draft";
import { TextAreaField, TextField } from "./fields";

const STEP_LABELS = ["프로필", "페르소나", "첫 메시지", "공개 설정"];

/** 로그인 유저는 서버 세션에서 온다(페이지가 RSC에서 주입) */
export function CreateWizard({ user }: { user: PublicUser | null }) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlotDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <span className="text-4xl" aria-hidden>
          ✍️
        </span>
        <p className="text-sm text-text-sub">
          플롯을 만들려면 로그인이 필요해요.
          <br />
          만든 플롯에 크리에이터 이름이 표시돼요.
        </p>
        <Link
          href="/login"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  const patch = (p: Partial<PlotDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(null);
  };

  const toggleTag = (tag: string) => {
    setError(null);
    setDraft((d) => {
      if (d.tags.includes(tag)) {
        return { ...d, tags: d.tags.filter((t) => t !== tag) };
      }
      if (d.tags.length >= MAX_TAGS) return d;
      return { ...d, tags: [...d.tags, tag] };
    });
  };

  const addCustomTag = () => {
    const tag = customTag.replace(/[#\s]/g, "").slice(0, LIMITS.tag);
    if (!tag) return;
    setCustomTag("");
    toggleTag(tag);
  };

  const goNext = async () => {
    const message = validateStep(draft, step);
    if (message) {
      setError(message);
      return;
    }
    if (step < STEP_LABELS.length - 1) {
      setStep(step + 1);
      return;
    }
    // 마지막 스텝: 서버에 플롯 생성
    setSubmitting(true);
    try {
      const res = await fetch("/api/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          tagline: draft.tagline.trim(),
          description: draft.description.trim(),
          persona: draft.persona.trim(),
          firstMessage: draft.firstMessage.trim(),
          tags: draft.tags,
          emoji: draft.emoji,
          gradient: draft.gradient,
          visibility: draft.visibility,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "플롯을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.push(`/plots/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류예요. 연결을 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewPlot: PlotView = {
    id: "preview",
    name: draft.name.trim() || "이름 없는 캐릭터",
    tagline: draft.tagline.trim() || "한 줄 소개가 여기 보여요",
    description: draft.description,
    tags: draft.tags.length > 0 ? draft.tags : ["태그"],
    firstMessage: draft.firstMessage,
    creator: user.nickname,
    emoji: draft.emoji,
    gradient: draft.gradient,
    coverUrl: null,
    chats: 0,
    likes: 0,
    visibility: draft.visibility,
    mine: true,
    createdAt: "",
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-lg font-extrabold">만들기</h1>
        <div className="mt-3 flex items-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full",
                  i <= step ? "bg-primary" : "bg-surface-2",
                )}
              />
              <p
                className={cn(
                  "mt-1.5 text-[11px]",
                  i === step ? "font-bold text-primary" : "text-text-faint",
                )}
              >
                {i + 1}. {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <TextField
            label="캐릭터 이름"
            value={draft.name}
            onChange={(name) => patch({ name })}
            max={LIMITS.name}
            placeholder="예) 이서준, 백련화"
          />
          <TextField
            label="한 줄 소개"
            value={draft.tagline}
            onChange={(tagline) => patch({ tagline })}
            max={LIMITS.tagline}
            placeholder="예) 계약 연애를 제안한 재벌 3세"
          />
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-text-sub">커버 이모지</p>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => patch({ emoji })}
                  aria-label={`이모지 ${emoji}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border text-xl transition-colors",
                    draft.emoji === emoji
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-text-faint",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-text-sub">커버 색상</p>
            <div className="grid grid-cols-6 gap-1.5">
              {GRADIENTS.map((g) => (
                <button
                  key={g.join()}
                  type="button"
                  onClick={() => patch({ gradient: g })}
                  aria-label="커버 색상 선택"
                  className={cn(
                    "h-10 rounded-lg border-2 transition-colors",
                    draft.gradient.join() === g.join()
                      ? "border-primary"
                      : "border-transparent",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <TextAreaField
            label="세계관 소개"
            value={draft.description}
            onChange={(description) => patch({ description })}
            max={LIMITS.description}
            rows={5}
            placeholder="이야기의 배경과 상황을 소개해 주세요. 홈과 프로필에 공개돼요."
          />
          <TextAreaField
            label="성격·말투 (페르소나)"
            value={draft.persona}
            onChange={(persona) => patch({ persona })}
            max={LIMITS.persona}
            rows={6}
            placeholder={
              "AI가 연기할 캐릭터 설정이에요. 공개되지 않아요.\n예) 28세, 겉은 냉정하지만 서툴고 다정하다. 반말을 쓰며 놀리는 것을 좋아한다."
            }
            hint="나이, 관계, 말투(반말/존댓말), 습관을 구체적으로 쓸수록 대화가 좋아져요."
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <TextAreaField
            label="첫 메시지"
            value={draft.firstMessage}
            onChange={(firstMessage) => patch({ firstMessage })}
            max={LIMITS.firstMessage}
            rows={7}
            placeholder={
              "대화가 시작되는 장면이에요.\n예)\n*서준이 계약서를 테이블 위로 밀어 놓는다*\n\n조건은 간단해. 3개월간 내 연인인 척해 주는 것."
            }
            hint="*별표 사이*는 행동 지문으로, 나머지는 대사로 표시돼요."
          />
          {draft.firstMessage.trim() && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-text-sub">미리보기</p>
              <div className="flex items-start gap-2.5">
                <div
                  aria-hidden
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[17px]"
                  style={{
                    background: `linear-gradient(135deg, ${draft.gradient[0]}, ${draft.gradient[1]})`,
                  }}
                >
                  {draft.emoji}
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3">
                  <RoleplayContent text={draft.firstMessage} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-semibold text-text-sub">태그</p>
              <span className="text-[11px] text-text-faint">
                {draft.tags.length}/{MAX_TAGS}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...TAG_POOL, ...draft.tags])].map((tag) => (
                <Chip
                  key={tag}
                  active={draft.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customTag}
                maxLength={LIMITS.tag + 1}
                placeholder="직접 입력"
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-sm outline-none placeholder:text-text-faint focus:border-primary/60"
              />
              <Button variant="secondary" size="sm" className="h-9" onClick={addCustomTag}>
                추가
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-text-sub">공개 범위</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "public", title: "공개", desc: "홈 피드에 노출돼요" },
                  { v: "private", title: "비공개", desc: "나만 볼 수 있어요" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => patch({ visibility: opt.v })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    draft.visibility === opt.v
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-text-faint",
                  )}
                >
                  <p className="text-sm font-bold">{opt.title}</p>
                  <p className="mt-0.5 text-[12px] text-text-sub">{opt.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-text-faint">
              공개로 만들면 다른 유저의 홈 피드에도 보여요. 비공개는 나에게만 보입니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-text-sub">카드 미리보기</p>
            <div className="pointer-events-none max-w-[220px]">
              <PlotCard plot={previewPlot} mine />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2 pb-4">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            이전
          </Button>
        )}
        <Button size="lg" full disabled={submitting} onClick={() => void goNext()}>
          {step < STEP_LABELS.length - 1
            ? "다음"
            : submitting
              ? "만드는 중…"
              : "플롯 만들기"}
        </Button>
      </div>
    </div>
  );
}
