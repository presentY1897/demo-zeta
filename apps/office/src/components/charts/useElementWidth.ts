"use client";

import { useEffect, useRef, useState } from "react";

/** 컨테이너 실제 픽셀 폭 — SVG 좌표계를 왜곡 없이 잡기 위해 측정한다 */
export function useElementWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
