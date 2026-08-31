export const metadata = { title: "만들기" };

const STEPS = [
  { title: "프로필", desc: "이름, 한 줄 소개, 커버 스타일" },
  { title: "페르소나", desc: "성격, 말투, 세계관 설정" },
  { title: "첫 메시지", desc: "대화를 여는 장면과 행동 지문" },
  { title: "공개 설정", desc: "태그, 공개 범위, 안전 설정" },
];

/** 플롯 만들기 — 4단계 위저드로 구현 예정 */
export default function CreatePage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-lg font-extrabold">만들기</h1>
      <p className="mb-4 text-sm text-text-sub">
        나만의 캐릭터와 세계관으로 새로운 이야기를 시작하세요.
      </p>
      <ol className="space-y-2">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex items-center gap-3 rounded-card border border-line bg-surface p-4"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-[12px] text-text-faint">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-center text-[12px] text-text-faint">
        생성 위저드는 구현 예정입니다.
      </p>
    </div>
  );
}
