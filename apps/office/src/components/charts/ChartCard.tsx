"use client";

import { useState } from "react";
import { Card, cn } from "@theta/ui";

/** 차트 카드 — 제목/부제 + 차트↔표 전환 (표는 접근성 필수 경로) */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-text-faint">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
            showTable
              ? "bg-primary-soft text-primary"
              : "bg-surface-2 text-text-sub hover:text-text",
          )}
        >
          {showTable ? "차트 보기" : "표 보기"}
        </button>
      </div>
      {showTable ? table : children}
    </Card>
  );
}
