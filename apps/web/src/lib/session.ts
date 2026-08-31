"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { Plan } from "@theta/mocks";

export interface SessionUser {
  id: string;
  nickname: string;
  plan: Plan;
  hue: number;
}

interface SessionState {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "theta-session" },
  ),
);

/** persist 복원 전 SSR 마크업과의 하이드레이션 불일치를 막는다 */
export function useSessionUser(): SessionUser | null {
  const user = useSession((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? user : null;
}
