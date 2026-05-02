"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";

type HelpHintProps = {
  text: string;
  href?: string;
};

export function HelpHint({ text, href = "/docs" }: HelpHintProps): ReactElement {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });

  const placeTooltip = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const top = Math.max(12, Math.min(window.innerHeight - 180, rect.bottom + 6));
    setPosition({ left, top });
  }, []);

  return (
    <span
      className="group relative inline-flex align-middle"
      onMouseEnter={placeTooltip}
      onFocus={placeTooltip}
    >
      <span
        ref={anchorRef}
        tabIndex={0}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-[#c586c0] font-serif text-[11px] italic leading-none text-[#c586c0] outline-none transition-colors duration-150 group-hover:border-[#dcdcaa] group-hover:text-[#dcdcaa] group-focus-within:border-[#dcdcaa] group-focus-within:text-[#dcdcaa]"
      >
        ?
      </span>
      <span
        className="fixed z-50 hidden w-[min(20rem,calc(100vw-2rem))] rounded border border-[var(--border-subtle)] bg-[#001b33] p-3 font-sans text-[12px] normal-case leading-5 tracking-normal text-[var(--text-primary)] shadow-xl group-hover:block group-focus-within:block"
        style={{ left: position.left, top: position.top }}
      >
        {text}
        <a
          href={href}
          className="mt-2 block font-mono text-[10px] normal-case tracking-normal text-[#36c2ff] underline-offset-2 hover:underline"
        >
          Open docs
        </a>
      </span>
    </span>
  );
}
