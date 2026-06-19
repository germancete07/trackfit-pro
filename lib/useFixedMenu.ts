"use client";

import { useState, useCallback, useEffect } from "react";

export interface FixedMenuPos {
  top: number;
  left: number;
}

/**
 * Returns position for a fixed-positioned dropdown that:
 * - Opens below the trigger by default
 * - Flips upward if there isn't enough room below
 * - Aligns to the right edge of the trigger, clamped within viewport
 */
export function calcFixedMenuPos(
  triggerRect: DOMRect,
  menuWidth = 208,
  menuHeight = 280,
): FixedMenuPos {
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const top =
    spaceBelow < menuHeight + 8
      ? triggerRect.top - menuHeight - 4  // open upward
      : triggerRect.bottom + 4;           // open downward

  const left = Math.min(
    triggerRect.right - menuWidth,
    window.innerWidth - menuWidth - 8,
  );

  return { top, left };
}

/**
 * Hook that manages a single open/close state for a fixed popover.
 * Returns trigger props and popover position.
 *
 * Usage:
 *   const { open, pos, openMenu, closeMenu } = useFixedMenu();
 *   <button ref={...} onClick={e => openMenu(e.currentTarget)} />
 *   {open && <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999 }}>...</div>}
 */
export function useFixedMenu(menuWidth = 208, menuHeight = 280) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<FixedMenuPos>({ top: 0, left: 0 });

  const openMenu = useCallback(
    (trigger: HTMLElement) => {
      const rect = trigger.getBoundingClientRect();
      setPos(calcFixedMenuPos(rect, menuWidth, menuHeight));
      setOpen(true);
    },
    [menuWidth, menuHeight],
  );

  const closeMenu = useCallback(() => setOpen(false), []);

  // Close on outside interaction or scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return { open, pos, openMenu, closeMenu };
}
