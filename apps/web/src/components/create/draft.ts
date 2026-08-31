import { featuredTags } from "@theta/mocks";

export interface PlotDraft {
  name: string;
  tagline: string;
  emoji: string;
  gradient: [string, string];
  description: string;
  persona: string;
  firstMessage: string;
  tags: string[];
  visibility: "public" | "private";
}

export const EMOJIS = [
  "🖤", "🌹", "⚔️", "🕊️", "☕", "❄️", "🔥", "🌙",
  "🎸", "🦊", "🐺", "🤖", "🧛", "🧙", "👑", "🗡️",
  "🎀", "🌸", "⭐", "🌊", "🍀", "🎭", "📚", "🕯️",
] as const;

export const GRADIENTS: [string, string][] = [
  ["#2b2d5e", "#7a68f5"],
  ["#3d2c1e", "#c98a3d"],
  ["#1e2a4a", "#8fb3ff"],
  ["#233524", "#7fc98a"],
  ["#1c2e45", "#6ec3e8"],
  ["#2e2222", "#b8534d"],
  ["#3a2b45", "#f08fb8"],
  ["#2a1a2e", "#a4508b"],
  ["#1f2b3a", "#5a9bd8"],
  ["#26263c", "#8e97c9"],
  ["#1b2f2e", "#5fd4c0"],
  ["#33202b", "#e8875f"],
];

export const TAG_POOL: string[] = [
  ...featuredTags,
  "뱀파이어", "아포칼립스", "구미호", "코믹", "힐링",
  "청춘", "능글", "집착", "소꿉친구", "동양판타지",
];

export const MAX_TAGS = 4;

export const LIMITS = {
  name: 20,
  tagline: 40,
  description: 300,
  persona: 500,
  firstMessage: 500,
  tag: 8,
} as const;

export function emptyDraft(): PlotDraft {
  return {
    name: "",
    tagline: "",
    emoji: "🌙",
    gradient: GRADIENTS[0] ?? ["#2b2d5e", "#7a68f5"],
    description: "",
    persona: "",
    firstMessage: "",
    tags: [],
    visibility: "public",
  };
}

/** 각 스텝의 유효성 오류 메시지 — 통과 시 null */
export function validateStep(draft: PlotDraft, step: number): string | null {
  switch (step) {
    case 0:
      if (!draft.name.trim()) return "캐릭터 이름을 입력해 주세요.";
      if (!draft.tagline.trim()) return "한 줄 소개를 입력해 주세요.";
      return null;
    case 1:
      if (!draft.description.trim()) return "세계관 소개를 입력해 주세요.";
      if (!draft.persona.trim()) return "성격·말투 설정을 입력해 주세요.";
      return null;
    case 2:
      if (!draft.firstMessage.trim()) return "첫 메시지를 입력해 주세요.";
      return null;
    case 3:
      if (draft.tags.length === 0) return "태그를 1개 이상 선택해 주세요.";
      return null;
    default:
      return null;
  }
}
