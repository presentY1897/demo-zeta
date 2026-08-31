/** 받침 유무에 따라 조사를 고른다: josa("서준", "이", "가") → "이" */
export function josa(word: string, withJong: string, without: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return without;
  return (last - 0xac00) % 28 > 0 ? withJong : without;
}
