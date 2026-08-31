"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { plots, featuredTags, notices } from "@theta/mocks";
import { Chip } from "@theta/ui";
import { PlotCard } from "@/components/PlotCard";

export default function HomePage() {
  const [tag, setTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...plots].sort((a, b) => b.chats - a.chats);
    return tag ? sorted.filter((p) => p.tags.includes(tag)) : sorted;
  }, [tag]);

  const pinned = notices.find((n) => n.pinned);

  return (
    <div className="space-y-4">
      {pinned && (
        <Link
          href={`/notices/${pinned.id}`}
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-4 py-2.5 text-[13px] text-text-sub transition-colors hover:border-primary/60"
        >
          <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
            {pinned.category}
          </span>
          <span className="line-clamp-1 flex-1">{pinned.title}</span>
          <span aria-hidden className="text-text-faint">
            ›
          </span>
        </Link>
      )}

      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1">
        <Chip active={tag === null} onClick={() => setTag(null)}>
          전체
        </Chip>
        {featuredTags.map((t) => (
          <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
            #{t}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((plot) => (
          <PlotCard key={plot.id} plot={plot} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-text-faint">
          해당 태그의 플롯이 아직 없어요.
        </p>
      )}
    </div>
  );
}
