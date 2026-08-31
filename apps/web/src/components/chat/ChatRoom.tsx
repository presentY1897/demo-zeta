"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Plot } from "@theta/mocks";
import { cn } from "@theta/ui";
import { useChatStore } from "@/lib/chat-store";
import { streamChat } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import {
  PRESETS,
  toProviderConfig,
  useAiSettingsHydrated,
  validateProviderConfig,
} from "@/lib/ai/settings";
import type { ChatTurn } from "@/lib/ai/types";
import { AssistantBubble, RoleplayContent, UserBubble } from "./MessageBubble";
import { PlotAvatar } from "./PlotAvatar";
import { TypingDots } from "./TypingDots";
import { Composer } from "./Composer";

interface LiveState {
  text: string;
  phase: "waiting" | "streaming";
}

export function ChatRoom({ plot }: { plot: Plot }) {
  const settings = useAiSettingsHydrated();
  const room = useChatStore((s) => s.rooms[plot.id]);
  const {
    ensureRoom,
    appendMessage,
    removeLastAssistant,
    truncateFrom,
    resetRoom,
  } = useChatStore();

  const [live, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (settings.hydrated && !room) ensureRoom(plot.id, plot.firstMessage);
  }, [settings.hydrated, room, ensureRoom, plot.id, plot.firstMessage]);

  // 새 메시지/스트리밍 진행 시, 사용자가 하단 근처에 있을 때만 자동 스크롤
  const messageCount = room?.messages.length ?? 0;
  const liveText = live?.text ?? "";
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messageCount, liveText, error]);

  // 언마운트 시 진행 중인 스트림 정리
  useEffect(() => () => abortRef.current?.abort(), []);

  const toTurns = (): ChatTurn[] =>
    (room?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));

  async function run(turns: ChatTurn[]) {
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

    setLive({ text: "", phase: "waiting" });
    let acc = "";
    try {
      const req = {
        provider,
        system: buildSystemPrompt(plot),
        plotName: plot.name,
        messages: turns,
      };
      for await (const chunk of streamChat(req, controller.signal)) {
        acc += chunk;
        setLive({ text: acc, phase: "streaming" });
      }
      if (acc.trim()) {
        appendMessage(plot.id, { role: "assistant", content: acc });
      } else {
        setError("빈 응답을 받았어요. 다시 시도해 주세요.");
      }
    } catch (e) {
      if (controller.signal.aborted) {
        if (acc.trim()) {
          appendMessage(plot.id, {
            role: "assistant",
            content: acc,
            interrupted: true,
          });
        }
      } else {
        setError(e instanceof Error ? e.message : "응답 생성에 실패했어요.");
      }
    } finally {
      setLive(null);
      abortRef.current = null;
    }
  }

  const busy = live !== null;

  function send(text: string) {
    if (busy || !room) return;
    appendMessage(plot.id, { role: "user", content: text });
    void run([...toTurns(), { role: "user", content: text }]);
  }

  function stop() {
    abortRef.current?.abort();
  }

  const lastMessage = room?.messages[room.messages.length - 1];
  const canRegenerate =
    !busy &&
    !!room &&
    room.messages.length >= 2 &&
    lastMessage?.role === "assistant";
  const canRetry = !busy && lastMessage?.role === "user";

  // 수정/다시 보내기 대상: 대화 꼬리([유저] 또는 [유저, 어시스턴트])의 유저 메시지
  const messages = room?.messages ?? [];
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  const actionableUserId =
    !busy && lastUserIndex >= 0 && lastUserIndex >= messages.length - 2
      ? messages[lastUserIndex]?.id
      : undefined;

  /** 해당 유저 메시지부터 뒤를 잘라내고 새 내용으로 다시 보낸다 */
  function resendFrom(messageId: string, text: string) {
    if (busy || !room) return;
    const idx = room.messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    const keptTurns: ChatTurn[] = room.messages
      .slice(0, idx)
      .map((m) => ({ role: m.role, content: m.content }));
    truncateFrom(plot.id, messageId);
    appendMessage(plot.id, { role: "user", content: text });
    setEditing(null);
    void run([...keptTurns, { role: "user", content: text }]);
  }

  function regenerate() {
    if (!canRegenerate) return;
    removeLastAssistant(plot.id);
    void run(toTurns().slice(0, -1));
  }

  function retry() {
    if (!canRetry) return;
    void run(toTurns());
  }

  function reset() {
    if (busy) return;
    if (window.confirm("대화를 처음부터 다시 시작할까요? 기록이 사라져요.")) {
      resetRoom(plot.id, plot.firstMessage);
    }
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
          onClick={reset}
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
          stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {room?.messages.map((msg) => {
          if (msg.role === "assistant") {
            return (
              <AssistantBubble
                key={msg.id}
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
          if (editing?.id === msg.id) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="w-full max-w-[85%] rounded-2xl border border-primary/60 bg-surface p-2">
                  <textarea
                    autoFocus
                    value={editing.text}
                    rows={3}
                    onChange={(e) =>
                      setEditing({ id: msg.id, text: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        if (editing.text.trim()) {
                          resendFrom(msg.id, editing.text.trim());
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
                      onClick={() => resendFrom(msg.id, editing.text.trim())}
                      className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-strong disabled:bg-surface-2 disabled:text-text-faint"
                    >
                      다시 보내기
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const showActions = actionableUserId === msg.id && !editing;
          return (
            <div key={msg.id} className="space-y-1">
              <UserBubble content={msg.content} />
              {showActions && (
                <div className="flex justify-end gap-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ id: msg.id, text: msg.content })}
                    className="rounded-md px-2 py-0.5 text-[12px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text-sub"
                  >
                    수정
                  </button>
                  {lastUserIndex === messages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => resendFrom(msg.id, msg.content)}
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
            {live.phase === "waiting" ? (
              <TypingDots />
            ) : (
              <RoleplayContent text={live.text} />
            )}
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
              onClick={regenerate}
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

      <Composer
        busy={busy}
        disabled={editing !== null}
        onSend={send}
        onStop={stop}
      />
    </div>
  );
}
