import type { ChatTurn } from "@/lib/ai/types";
import { josa } from "@/lib/josa";

function buildReply(plotName: string, lastUser: string): string {
  const sub = plotName + josa(plotName, "이", "가"); // "이서준이" / "백련화가"
  const echo = lastUser.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 30);

  const variants: string[] = [
    `*${sub} 잠시 말없이 당신을 바라본다*\n\n"${echo}"… 그렇게 말할 줄은 몰랐는데.\n\n*입가에 옅은 미소가 스친다*\n\n좋아. 그럼 다음은 네가 정해. 어디까지 갈 수 있는지 보자.`,
    `*${sub} 고개를 갸웃하더니 한 걸음 다가온다*\n\n방금 그 말, 진심이야? …아니, 대답하지 마. 표정 보면 알아.\n\n*시선을 피하지 않은 채*\n\n계속해 봐. 듣고 있으니까.`,
    `*잠깐의 침묵. ${sub} 낮게 웃는다*\n\n"${echo}"라니. 너는 정말 예측이 안 되는군.\n\n그래서 더 궁금해지는 거지만. 그 다음은? 여기서 멈출 생각은 아니겠지.`,
    `*${sub} 팔짱을 끼고 벽에 기댄다*\n\n흐음… 일리는 있어. 인정할 건 인정하지.\n\n*손끝으로 가볍게 팔을 두드리며*\n\n하지만 조건이 하나 있다. 먼저 네 이유부터 들려줘.`,
  ];
  const greeting = `*${sub} 당신을 발견하고 표정이 살짝 풀린다*\n\n왔구나. 기다리고 있었어.\n\n*옆자리를 가리키며*\n\n오늘은 무슨 이야기를 해 볼까?`;

  if (!echo) return greeting;
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx] ?? greeting;
}

/**
 * 키 없이 동작하는 데모 모델 — 타이핑 딜레이를 흉내 내며
 * 롤플레잉 형식의 응답을 몇 글자씩 스트리밍한다.
 */
export function mockStream(
  plotName: string,
  messages: ChatTurn[],
): ReadableStream<Uint8Array> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const reply = buildReply(plotName, lastUser?.content ?? "");
  const encoder = new TextEncoder();
  let cancelled = false;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  return new ReadableStream({
    async start(controller) {
      // 첫 토큰 전 "생각하는" 시간
      await sleep(600 + Math.random() * 500);
      for (let pos = 0; pos < reply.length && !cancelled; ) {
        const step = 1 + Math.floor(Math.random() * 3);
        controller.enqueue(encoder.encode(reply.slice(pos, pos + step)));
        pos += step;
        await sleep(14 + Math.random() * 22);
      }
      if (!cancelled) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
}
