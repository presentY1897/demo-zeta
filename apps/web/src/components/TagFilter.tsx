"use client";

import { useRouter } from "next/navigation";
import { Chip } from "@theta/ui";

/** 태그 필터는 이제 서버 조회 조건이라 선택을 URL에 싣는다(공유·뒤로가기 가능) */
export function TagFilter({
  tags,
  active,
}: {
  tags: readonly string[];
  active: string | null;
}) {
  const router = useRouter();

  const select = (tag: string | null) => {
    router.push(tag ? `/?tag=${encodeURIComponent(tag)}` : "/", { scroll: false });
  };

  return (
    <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1">
      <Chip active={active === null} onClick={() => select(null)}>
        전체
      </Chip>
      {tags.map((tag) => (
        <Chip
          key={tag}
          active={active === tag}
          onClick={() => select(active === tag ? null : tag)}
        >
          #{tag}
        </Chip>
      ))}
    </div>
  );
}
