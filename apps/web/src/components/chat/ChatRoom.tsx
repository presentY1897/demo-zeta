"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@theta/ui";
import type { PlotView } from "@/lib/plot-view";
import type { ChatMessage } from "@/lib/chat-types";
import { ChatRequestError, streamChat } from "@/lib/ai/client";
import {
  PRESETS,
  toProviderConfig,
  useAiSettingsHydrated,
  validateProviderConfig,
} from "@/lib/ai/settings";
import { AssistantBubble, RoleplayContent, UserBubble } from "./MessageBubble";
import { PlotAvatar } from "./PlotAvatar";
import { TypingDots } from "./TypingDots";
import { Composer } from "./Composer";

interface LiveState {
  text: string;
  phase: "waiting" | "streaming";
}

/**
 * 대화 화면. 메시지는 서버가 진실이고 이 컴포넌트는 화면 캐시 + 옵티미스틱 렌더를 맡는다.
 * 시스템 프롬프트 조립과 저장은 전부 /api/chat 안에서 일어난다.
 */
export function ChatRoom({
  plot,
  roomId,
  initialMessages,
}: {
  plot: PlotView;
  roomId: string;
  initialMessages: ChatMessage[];
}) {
  const settings = useAiSettingsHydrated();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [live, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ seq: number; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // 새 메시지/스트리밍 진행 시, 사용자가 하단 근처에 있을 때만 자동 스크롤
  const liveText = live?.text ?? "";
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, liveText, error]);

  // 언마운트 시 진행 중인 스트림 정리
  useEffect(() => () => abortRef.current?.abort(), []);

  const nextSeq = (list: ChatMessage[]): number => (list[list.length - 1]?.seq ?? -1) + 1;

  /**
   * 요청 한 번. `userMessage`가 있으면 서버가 먼저 저장하고 seq를 헤더로 알려주며,
   * 저장되지 않았다면 옵티미스틱하게 그린 메시지를 되돌린다.
   */
  async function run(options: { userMessage?: string } = {}): Promise<void> {
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    stickToBottomRef.current = true;

    // 서버 왕복 전에 잡을 수 있는 설정 누락은 바로 안내
    const provider = toProviderConfig(settings);
    const configProblem = validateProviderConfig(provider);
    if (configProblem) {
      setError(`${configProblem} 내 AI 연결 설정을 확인해 주세요.`);
      abortRef.current = null;
      return;
    }

    // 중단 신호에 실을 기준점 — 응답이 붙을 자리 바로 앞 메시지
    let afterSeq = messages[messages.length - 1]?.seq ?? -1;

    const optimistic = options.userMessage;
    if (optimistic !== undefined) {
      setMessages((prev) => [
        ...prev,
        { seq: nextSeq(prev), role: "user", content: optimistic, interrupted: false },
      ]);
    }

    setLive({ text: "", phase: "waiting" });
    let acc = "";
    try {
      const { userSeq, chunks } = await streamChat(
        { roomId, provider, userMessage: options.userMessage },
        controller.signal,
      );
      if (optimistic !== undefined) confirmUserMessage(userSeq);
      if (userSeq !== null) afterSeq = userSeq;

      for await (const chunk of chunks) {
        acc += chunk;
        setLive({ text: acc, phase: "streaming" });
      }
      if (acc.trim()) {
        appendAssistant(acc, false);
      } else {
        setError("빈 응답을 받았어요. 다시 시도해 주세요.");
      }
    } catch (e) {
      if (controller.signal.aborted) {
        await reportInterrupted(acc, afterSeq);
      } else {
        if (optimistic !== undefined && e instanceof ChatRequestError && e.userSeq === null) {
          // 서버가 유저 메시지를 저장하기 전에 실패 — 화면에서도 되돌린다
          rollbackOptimistic();
        }
        setError(e instanceof Error ? e.message : "응답 생성에 실패했어요.");
      }
    } finally {
      setLive(null);
      abortRef.current = null;
    }

    function confirmUserMessage(seq: number | null) {
      if (seq === null) return;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "user") copy[copy.length - 1] = { ...last, seq };
        return copy;
      });
    }

    /**
     * 서버리스에서는 연결을 끊어도 실행 중인 함수에 전파되지 않아 전체 응답이 저장된다.
     * 어디까지 받았는지를 서버에 알려 화면과 DB를 맞춘다.
     */
    async function reportInterrupted(text: string, seq: number): Promise<void> {
      try {
        const res = await fetch(`/api/rooms/${roomId}/interrupt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, afterSeq: seq }),
        });
        if (res.ok) {
          const data = (await res.json()) as { messages: ChatMessage[] };
          setMessages(data.messages);
          return;
        }
      } catch {
        /* 아래 폴백으로 */
      }
      // 신호를 못 보냈으면 화면만이라도 맞춰 둔다(새로고침하면 서버 상태로 정정된다)
      if (text.trim()) appendAssistant(text, true);
    }

    function rollbackOptimistic() {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "user" ? prev.slice(0, -1) : prev;
      });
    }
  }

  function appendAssistant(content: string, interrupted: boolean) {
    setMessages((prev) => [
      ...prev,
      { seq: nextSeq(prev), role: "assistant", content, interrupted },
    ]);
  }

  const busy = live !== null;

  function send(text: string) {
    if (busy) return;
    void run({ userMessage: text });
  }

  function stop() {
    abortRef.current?.abort();
  }

  /** 서버에서 seq 이후를 지우고 화면도 맞춘다 */
  async function truncateFrom(seq: number): Promise<boolean> {
    const res = await fetch(`/api/rooms/${roomId}/messages?fromSeq=${seq}`, { method: "DELETE" });
    if (!res.ok) {
      setError("이전 메시지를 정리하지 못했어요.");
      return false;
    }
    setMessages((prev) => prev.filter((m) => m.seq < seq));
    return true;
  }

  const lastMessage = messages[messages.length - 1];
  const canRegenerate = !busy && messages.length >= 2 && lastMessage?.role === "assistant";
  const canRetry = !busy && lastMessage?.role === "user";

  // 수정/다시 보내기 대상: 대화 꼬리([유저] 또는 [유저, 어시스턴트])의 유저 메시지
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  const actionableUserSeq =
    !busy && lastUserIndex >= 0 && lastUserIndex >= messages.length - 2
      ? messages[lastUserIndex]?.seq
      : undefined;

  /** 해당 유저 메시지부터 뒤를 잘라내고 새 내용으로 다시 보낸다 */
  async function resendFrom(seq: number, text: string) {
    if (busy || seq < 1) return;
    setEditing(null);
    if (!(await truncateFrom(seq))) return;
    await run({ userMessage: text });
  }

  async function regenerate() {
    if (!canRegenerate || lastMessage === undefined) return;
    if (!(await truncateFrom(lastMessage.seq))) return;
    await run();
  }

  function retry() {
    if (!canRetry) return;
    void run();
  }

  async function reset() {
    if (busy) return;
    if (!window.confirm("대화를 처음부터 다시 시작할까요? 기록이 사라져요.")) return;
    const res = await fetch(`/api/rooms/${roomId}/reset`, { method: "POST" });
    if (!res.ok) {
      setError("대화를 초기화하지 못했어요.");
      return;
    }
    const data = (await res.json()) as { messages: ChatMessage[] };
    setMessages(data.messages);
    setError(null);
  }

  const modelLabel = !settings.hydrated
    ? ""
    : settings.mode === "mock"
      ? "데모 모델"
      : settings.model || PRESETS[settings.preset].label;

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link
          href="/chat"
          aria-label="대화 목록으로"
          className="flex size-9 items-center justify-center rounded-lg text-lg text-text-sub transition-colors hover:bg-surface-2"
        >
          ←
        </Link>
        <PlotAvatar plot={plot} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{plot.name}</p>
          <Link
            href="/my/ai"
            className="inline-block truncate rounded-md bg-surface-2 px-1.5 py-px text-[11px] text-text-sub transition-colors hover:text-text"
          >
            {modelLabel} ⚙
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void reset()}
          aria-label="대화 초기화"
          title="대화 초기화"
          className="flex size-9 items-center justify-center rounded-lg text-text-sub transition-colors hover:bg-surface-2"
        >
          ↺
        </button>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.map((msg) => {
          if (msg.role === "assistant") {
            return (
              <AssistantBubble
                key={msg.seq}
                plot={plot}
                footer={
                  msg.interrupted ? (
                    <p className="mt-1 pl-1 text-[11px] text-text-faint">
                      ⏹ 응답이 중단됐어요
                    </p>
                  ) : undefined
                }
              >
                <RoleplayContent text={msg.content} />
              </AssistantBubble>
            );
          }

          // 수정 모드: 버블 대신 인라인 편집 박스
          if (editing?.seq === msg.seq) {
            return (
              <div key={msg.seq} className="flex justify-end">
                <div className="w-full max-w-[85%] rounded-2xl border border-primary/60 bg-surface p-2">
                  <textarea
                    autoFocus
                    value={editing.text}
                    rows={3}
                    onChange={(e) => setEditing({ seq: msg.seq, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        if (editing.text.trim()) {
                          void resendFrom(msg.seq, editing.text.trim());
                        }
                      }
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-sub transition-colors hover:bg-surface-2"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={!editing.text.trim()}
                      onClick={() => void resendFrom(msg.seq, editing.text.trim())}
                      className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-strong disabled:bg-surface-2 disabled:text-text-faint"
                    >
                      다시 보내기
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const showActions = actionableUserSeq === msg.seq && !editing;
          return (
            <div key={msg.seq} className="space-y-1">
              <UserBubble content={msg.content} />
              {showActions && (
                <div className="flex justify-end gap-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ seq: msg.seq, text: msg.content })}
                    className="rounded-md px-2 py-0.5 text-[12px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text-sub"
                  >
                    수정
                  </button>
                  {lastUserIndex === messages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => void resendFrom(msg.seq, msg.content)}
                      className="rounded-md px-2 py-0.5 text-[12px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text-sub"
                    >
                      다시 보내기
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {live && (
          <AssistantBubble plot={plot}>
            {live.phase === "waiting" ? <TypingDots /> : <RoleplayContent text={live.text} />}
          </AssistantBubble>
        )}

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
            <p className="min-w-0 flex-1 text-[13px] text-danger">{error}</p>
            <div className="flex shrink-0 gap-1.5">
              <Link
                href="/my/ai"
                className="rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-text-sub transition-colors hover:bg-line"
              >
                AI 설정
              </Link>
              {canRetry && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-lg bg-danger/20 px-3 py-1.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger/30"
                >
                  재시도
                </button>
              )}
            </div>
          </div>
        )}

        {canRegenerate && !error && !editing && (
          <div className="pl-11">
            <button
              type="button"
              onClick={() => void regenerate()}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[12px] text-text-faint transition-colors",
                "hover:bg-surface-2 hover:text-text-sub",
              )}
            >
              ↺ 다시 생성
            </button>
          </div>
        )}
      </div>

      <Composer busy={busy} disabled={editing !== null} onSend={send} onStop={stop} />
    </div>
  );
}
