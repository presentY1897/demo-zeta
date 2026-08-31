/** 응답 대기 중 타이핑 인디케이터 */
export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-1.5" role="status" aria-label="응답 작성 중">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-text-faint"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
