import Link from "next/link";
import type { Plot } from "@theta/mocks";
import { formatCount } from "@/lib/format";
import { PlotCover } from "./PlotCover";

export function PlotCard({ plot, mine }: { plot: Plot; mine?: boolean }) {
  return (
    <Link
      href={`/plots/${plot.id}`}
      className="group block overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlotCover
          plot={plot}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        {mine && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
            MY
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
          <p className="text-[15px] font-bold text-white">{plot.name}</p>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-1 text-[13px] text-text-sub">{plot.tagline}</p>
        <div className="flex flex-wrap gap-1">
          {plot.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-sub"
            >
              #{tag}
            </span>
          ))}
        </div>
        <p className="text-[12px] text-text-faint">
          💬 {formatCount(plot.chats)} · ❤️ {formatCount(plot.likes)}
        </p>
      </div>
    </Link>
  );
}
