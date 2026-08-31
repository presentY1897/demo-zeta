import type { Plot } from "@theta/mocks";
import { cn } from "@theta/ui";
import { parseRoleplay } from "@/lib/roleplay";
import { PlotAvatar } from "./PlotAvatar";

/** 어시스턴트 본문 — *지문*은 흐리게, 대사는 또렷하게 */
export function RoleplayContent({ text }: { text: string }) {
  const segments = parseRoleplay(text);
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => (
        <p
          key={i}
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            seg.type === "action"
              ? "text-[13px] italic text-text-faint"
              : "text-sm",
          )}
        >
          {seg.text}
        </p>
      ))}
    </div>
  );
}

export function AssistantBubble({
  plot,
  children,
  footer,
}: {
  plot: Plot;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <PlotAvatar plot={plot} />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-white">
        {content}
      </div>
    </div>
  );
}
