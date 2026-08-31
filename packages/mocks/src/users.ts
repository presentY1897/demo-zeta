import { createRng, daysAgo, isoDate } from "./rng";
import { plots } from "./plots";
import type { MockUser, ModelId } from "./types";

const FIRST = [
  "달빛", "별빛", "새벽", "구름", "노을", "안개", "이슬", "바람", "숲속", "호수",
  "겨울", "여름", "봄날", "가을", "심야", "우주", "은하", "유성", "장미", "민트",
];
const SECOND = [
  "여우", "토끼", "고양이", "늑대", "부엉이", "수달", "고래", "펭귄", "사슴", "햄스터",
  "드래곤", "마법사", "기사", "집사", "탐정", "사서", "화가", "작가", "요정", "선장",
];

/**
 * 시드 고정으로 생성되는 유저 800명.
 * 오피스의 유저 관리/지표 화면에서 사용한다.
 */
export function generateUsers(count = 800): MockUser[] {
  const rng = createRng(20260831);
  const users: MockUser[] = [];

  for (let i = 0; i < count; i++) {
    const joinedDaysAgo = rng.int(0, 300);
    // 최근 활동일은 가입일 이후 — 헤비 유저일수록 최근에 활동
    const heavy = rng.next() < 0.25;
    const lastActiveDaysAgo = heavy
      ? rng.int(0, 3)
      : Math.min(joinedDaysAgo, rng.int(0, 45));

    const activeDays = Math.max(1, joinedDaysAgo - lastActiveDaysAgo);
    const turnsPerDay = heavy ? rng.int(60, 240) : rng.int(2, 40);
    const totalTurns = Math.min(activeDays, 200) * turnsPerDay;

    // 턴당 평균 토큰: input ~900 / output ~450
    const totalTokens = totalTurns * rng.int(1100, 1600);
    const lucaShare = heavy ? 0.25 + rng.next() * 0.2 : rng.next() * 0.15;
    const kojiShare = 0.3 + rng.next() * 0.2;
    const tokensByModel: Record<ModelId, number> = {
      "koji-lite": Math.round(totalTokens * (1 - lucaShare - kojiShare)),
      koji: Math.round(totalTokens * kojiShare),
      luca: Math.round(totalTokens * lucaShare),
    };

    const favoriteCount = rng.int(0, 4);
    const favoritePlotIds = [...new Set(
      Array.from({ length: favoriteCount }, () => rng.pick(plots).id),
    )];

    users.push({
      id: `u${String(i + 1).padStart(4, "0")}`,
      nickname: `${rng.pick(FIRST)}${rng.pick(SECOND)}${rng.int(1, 999)}`,
      country: rng.weighted([
        ["KR", 0.5],
        ["JP", 0.35],
        ["US", 0.15],
      ] as const),
      plan: rng.next() < (heavy ? 0.45 : 0.07) ? "pass" : "free",
      status: rng.next() < 0.02 ? "suspended" : "active",
      hue: rng.int(0, 359),
      joinedAt: isoDate(daysAgo(joinedDaysAgo)),
      lastActiveAt: isoDate(daysAgo(lastActiveDaysAgo)),
      totalTurns,
      tokensByModel,
      favoritePlotIds,
    });
  }
  return users;
}

export const users = generateUsers();

export function getUser(id: string): MockUser | undefined {
  return users.find((u) => u.id === id);
}
