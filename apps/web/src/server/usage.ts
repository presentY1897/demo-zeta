import { usageEvents, type Database } from "@theta/db";

/**
 * 토큰 추정 계수 — OpenAI 호환·Anthropic 스트림이 usage를 주지 않는 경우가 많고
 * 모의 모드·Ollama는 애초에 값이 없어, 글자 수로 근사한다.
 * 한글은 한 글자가 대략 0.7토큰, 그 외(영문·공백·기호)는 대략 0.3토큰으로 잡았다.
 * 오피스 화면에는 "추정치" 라벨을 함께 표시한다.
 */
export const TOKENS_PER_HANGUL_CHAR = 0.7;
export const TOKENS_PER_OTHER_CHAR = 0.3;

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  let hangul = 0;
  for (const ch of text) if (HANGUL.test(ch)) hangul++;
  const other = [...text].length - hangul;
  return Math.max(
    1,
    Math.round(hangul * TOKENS_PER_HANGUL_CHAR + other * TOKENS_PER_OTHER_CHAR),
  );
}

export interface UsageInput {
  userId: string;
  plotId: string;
  providerKind: string;
  model: string;
  promptText: string;
  responseText: string;
}

/** assistant 응답 1건(중단 포함) = 1행. 오피스 실사용 지표의 원천이다 */
export async function recordUsage(db: Database, input: UsageInput): Promise<void> {
  await db.insert(usageEvents).values({
    userId: input.userId,
    plotId: input.plotId,
    providerKind: input.providerKind,
    model: input.model,
    estInputTokens: estimateTokens(input.promptText),
    estOutputTokens: estimateTokens(input.responseText),
  });
}
