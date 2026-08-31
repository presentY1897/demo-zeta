"use client";

import { useId } from "react";
import { cn } from "@theta/ui";

const boxClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-text-faint focus:border-primary/60";

interface BaseProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  hint?: string;
}

export function TextField({ label, value, onChange, max, placeholder, hint }: BaseProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-text-sub">
          {label}
        </label>
        <span className="text-[11px] text-text-faint">
          {value.length}/{max}
        </span>
      </div>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(boxClass, "h-11")}
      />
      {hint && <p className="text-[12px] text-text-faint">{hint}</p>}
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  max,
  placeholder,
  hint,
  rows = 4,
}: BaseProps & { rows?: number }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-text-sub">
          {label}
        </label>
        <span className="text-[11px] text-text-faint">
          {value.length}/{max}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(boxClass, "resize-none py-2.5 leading-relaxed")}
      />
      {hint && <p className="text-[12px] text-text-faint">{hint}</p>}
    </div>
  );
}
