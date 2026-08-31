import { cn } from "./cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-line border-t-primary",
        className,
      )}
    />
  );
}
