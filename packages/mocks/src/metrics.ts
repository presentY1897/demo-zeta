import { createRng, daysAgo, isoDate } from "./rng";
import type { DailyMetric, ModelId, ModelInfo } from "./types";

/** 자체 서빙 모델 정보 — 원가는 1M 토큰당 GPU 서빙 비용(원) */
export const models: ModelInfo[] = [
  {
    id: "koji-lite",
    label: "koji-lite",
    description: "무료 유저 기본 모델. 짧은 응답, 최저 원가.",
    costPer1MInputKrw: 45,
    costPer1MOutputKrw: 130,
  },
  {
    id: "koji",
    label: "koji",
    description: "표준 대화 모델. 대부분의 트래픽을 처리.",
    costPer1MInputKrw: 160,
    costPer1MOutputKrw: 480,
  },
  {
    id: "luca",
    label: "luca",
    description: "플래그십 롤플레잉 모델. 세타패스 우선 적용.",
    costPer1MInputKrw: 420,
    costPer1MOutputKrw: 1250,
  },
];

const PASS_PRICE_KRW = 10_900;
/** 결제 수수료율 — 앱 내 결제(스토어 30%)와 웹 결제(PG 3.3%)의 가중 평균 근사 */
const BLENDED_FEE_RATE = 0.19;

/**
 * 최근 90일 일간 지표. 시드 고정.
 * DAU가 월 1.6배 수준으로 성장하는 곡선 + 주말 피크 + 노이즈.
 */
export function generateDailyMetrics(days = 90): DailyMetric[] {
  const rng = createRng(9_2026);
  const out: DailyMetric[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const t = (days - 1 - i) / (days - 1); // 0 → 1
    const growth = 165_000 * Math.pow(2.6, t); // ~165k → ~430k
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.14 : 1;
    const noise = 0.94 + rng.next() * 0.12;
    const dau = Math.round(growth * weekend * noise);

    const newUsers = Math.round(dau * (0.045 + rng.next() * 0.02));
    const turnsPerUser = 48 + rng.next() * 14;
    const turns = Math.round(dau * turnsPerUser);

    // 모델 비중: luca가 점점 커진다 (8% → 22%)
    const lucaShare = 0.08 + 0.14 * t;
    const kojiShare = 0.38;
    const liteShare = 1 - lucaShare - kojiShare;
    const shares: Record<ModelId, number> = {
      "koji-lite": liteShare,
      koji: kojiShare,
      luca: lucaShare,
    };

    const avgInputPerTurn = 950;
    const avgOutputPerTurn = 430;
    const tokens = {} as DailyMetric["tokens"];
    let gpuCostKrw = 0;
    for (const m of models) {
      const input = Math.round(turns * shares[m.id] * avgInputPerTurn);
      const output = Math.round(turns * shares[m.id] * avgOutputPerTurn);
      tokens[m.id] = { input, output };
      gpuCostKrw +=
        (input / 1_000_000) * m.costPer1MInputKrw +
        (output / 1_000_000) * m.costPer1MOutputKrw;
    }

    // 구독 매출: DAU의 일정 비율이 세타패스, 월액을 일할 계산
    const passUsers = dau * (0.055 + 0.02 * t);
    const revenueKrw = Math.round((passUsers * PASS_PRICE_KRW) / 30);
    const feeKrw = Math.round(revenueKrw * BLENDED_FEE_RATE);

    out.push({
      date: isoDate(date),
      dau,
      newUsers,
      turns,
      tokens,
      gpuCostKrw: Math.round(gpuCostKrw),
      revenueKrw,
      feeKrw,
    });
  }
  return out;
}

export const dailyMetrics = generateDailyMetrics();
