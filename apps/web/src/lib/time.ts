/** 대화 목록용 상대 시간 — 방금/n분 전/n시간 전/어제/M월 D일 */
export function formatRelativeTime(at: number, now = Date.now()): string {
  const diff = now - at;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "방금";
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 2 * day) return "어제";
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
