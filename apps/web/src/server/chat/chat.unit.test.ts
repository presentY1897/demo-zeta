import { describe, expect, it } from "vitest";
import { sseToTextStream } from "@/server/ai/sse";
import { persistingStream } from "@/server/chat/persist-stream";
import { estimateTokens, TOKENS_PER_HANGUL_CHAR } from "@/server/usage";
import { parseRoleplay } from "@/lib/roleplay";
import { buildSystemPrompt } from "@/server/chat/prompt";

const encoder = new TextEncoder();

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let out = "";
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    out += decoder.decode(chunk, { stream: true });
  }
  return out + decoder.decode();
}

const openaiDelta = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
const extract = (data: unknown) =>
  (data as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;

describe("sseToTextStream", () => {
  it("SSE 델타를 순수 텍스트로 이어 붙인다", async () => {
    const out = await collect(sseToTextStream(streamOf(openaiDelta("안"), openaiDelta("녕")), extract));
    expect(out).toBe("안녕");
  });

  it("청크 경계에서 잘린 JSON 라인을 이어 붙여 해석한다", async () => {
    const line = openaiDelta("반가워");
    const cut = Math.floor(line.length / 2);
    const out = await collect(
      sseToTextStream(streamOf(line.slice(0, cut), line.slice(cut)), extract),
    );
    expect(out).toBe("반가워");
  });

  it("[DONE]과 깨진 라인은 건너뛴다", async () => {
    const out = await collect(
      sseToTextStream(
        streamOf(openaiDelta("가"), "data: {부서진 JSON\n\n", "data: [DONE]\n\n", ": 주석\n\n"),
        extract,
      ),
    );
    expect(out).toBe("가");
  });

  it("델타가 없는 이벤트(빈 content)는 아무것도 내보내지 않는다", async () => {
    const out = await collect(
      sseToTextStream(streamOf(`data: ${JSON.stringify({ choices: [{ delta: {} }] })}\n\n`), extract),
    );
    expect(out).toBe("");
  });
});

describe("persistingStream", () => {
  it("정상 종료면 누적 텍스트를 중단 아님으로 한 번만 알린다", async () => {
    const calls: [string, boolean][] = [];
    const out = await collect(
      persistingStream(streamOf("안녕", "하세요"), (text, interrupted) =>
        calls.push([text, interrupted]),
      ),
    );
    expect(out).toBe("안녕하세요");
    expect(calls).toEqual([["안녕하세요", false]]);
  });

  it("중간에 취소되면 받은 데까지를 중단으로 알린다", async () => {
    const calls: [string, boolean][] = [];
    const stream = persistingStream(streamOf("가", "나", "다"), (text, interrupted) =>
      calls.push([text, interrupted]),
    );
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel("사용자 중단");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toBe(true);
    expect(calls[0]?.[0]).toBe("가");
  });

  it("업스트림이 에러로 끊겨도 받은 데까지 알린다", async () => {
    const calls: [string, boolean][] = [];
    let pulls = 0;
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) controller.enqueue(encoder.encode("절반"));
        else controller.error(new Error("업스트림 끊김"));
      },
    });
    const reader = persistingStream(source, (t, i) => calls.push([t, i])).getReader();
    await reader.read();
    await expect(reader.read()).rejects.toThrow();
    expect(calls).toEqual([["절반", true]]);
  });
});

describe("토큰 추정", () => {
  it("한글은 라틴 문자보다 토큰을 많이 잡는다", () => {
    expect(estimateTokens("가나다라마")).toBeGreaterThan(estimateTokens("abcde"));
    expect(estimateTokens("가나다라마")).toBe(Math.round(5 * TOKENS_PER_HANGUL_CHAR));
  });

  it("빈 문자열은 0, 짧은 입력도 최소 1", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a")).toBe(1);
  });

  it("길이에 비례한다", () => {
    const short = estimateTokens("안녕하세요");
    const long = estimateTokens("안녕하세요".repeat(10));
    expect(long).toBeGreaterThan(short * 8);
  });
});

describe("roleplay 파싱", () => {
  it("지문과 대사를 분리한다", () => {
    expect(parseRoleplay("*문을 연다* 안녕.")).toEqual([
      { type: "action", text: "문을 연다" },
      { type: "speech", text: "안녕." },
    ]);
  });

  it("스트리밍 중 닫히지 않은 별표도 지문으로 취급한다", () => {
    expect(parseRoleplay("좋아. *천천히 다가오")).toEqual([
      { type: "speech", text: "좋아." },
      { type: "action", text: "천천히 다가오" },
    ]);
  });

  it("별표가 없으면 전부 대사", () => {
    expect(parseRoleplay("그냥 대사")).toEqual([{ type: "speech", text: "그냥 대사" }]);
  });
});

describe("시스템 프롬프트", () => {
  it("페르소나와 세계관을 담는다", () => {
    const prompt = buildSystemPrompt({
      plotName: "이서준",
      persona: "냉정하지만 다정하다",
      description: "재벌 3세의 계약 연애",
    });
    expect(prompt).toContain("이서준");
    expect(prompt).toContain("냉정하지만 다정하다");
    expect(prompt).toContain("재벌 3세의 계약 연애");
    expect(prompt).toContain("*별표 사이의 지문*");
  });
});
