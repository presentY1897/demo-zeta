"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  /** 스트리밍 중단으로 잘린 응답 */
  interrupted?: boolean;
}

export interface ChatRoom {
  plotId: string;
  messages: StoredMessage[];
  updatedAt: number;
}

interface ChatState {
  rooms: Record<string, ChatRoom>;
  /** 방이 없으면 캐릭터의 첫 메시지로 개설 */
  ensureRoom: (plotId: string, firstMessage: string) => void;
  appendMessage: (
    plotId: string,
    msg: Omit<StoredMessage, "id" | "at"> & { at?: number },
  ) => void;
  /** 마지막 어시스턴트 응답 제거 (재생성용) */
  removeLastAssistant: (plotId: string) => void;
  resetRoom: (plotId: string, firstMessage: string) => void;
}

function newMessage(
  msg: Omit<StoredMessage, "id" | "at"> & { at?: number },
): StoredMessage {
  return { id: crypto.randomUUID(), at: msg.at ?? Date.now(), ...msg };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      rooms: {},
      ensureRoom: (plotId, firstMessage) =>
        set((s) => {
          if (s.rooms[plotId]) return s;
          return {
            rooms: {
              ...s.rooms,
              [plotId]: {
                plotId,
                messages: [
                  newMessage({ role: "assistant", content: firstMessage }),
                ],
                updatedAt: Date.now(),
              },
            },
          };
        }),
      appendMessage: (plotId, msg) =>
        set((s) => {
          const room = s.rooms[plotId];
          if (!room) return s;
          return {
            rooms: {
              ...s.rooms,
              [plotId]: {
                ...room,
                messages: [...room.messages, newMessage(msg)],
                updatedAt: Date.now(),
              },
            },
          };
        }),
      removeLastAssistant: (plotId) =>
        set((s) => {
          const room = s.rooms[plotId];
          const last = room?.messages[room.messages.length - 1];
          // 첫 메시지(인덱스 0)는 재생성 대상이 아니다
          if (!room || !last || last.role !== "assistant" || room.messages.length < 2) {
            return s;
          }
          return {
            rooms: {
              ...s.rooms,
              [plotId]: {
                ...room,
                messages: room.messages.slice(0, -1),
                updatedAt: Date.now(),
              },
            },
          };
        }),
      resetRoom: (plotId, firstMessage) =>
        set((s) => ({
          rooms: {
            ...s.rooms,
            [plotId]: {
              plotId,
              messages: [
                newMessage({ role: "assistant", content: firstMessage }),
              ],
              updatedAt: Date.now(),
            },
          },
        })),
    }),
    { name: "theta-chats" },
  ),
);

/** persist 복원 전 하이드레이션 불일치 방지 */
export function useChatRooms(): Record<string, ChatRoom> | null {
  const rooms = useChatStore((s) => s.rooms);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? rooms : null;
}
