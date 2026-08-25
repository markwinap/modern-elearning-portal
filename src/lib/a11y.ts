"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || !active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    const first = focusable.at(0) ?? container;
    const last = focusable.at(-1) ?? container;
    first.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);

  return ref;
}

export function useAriaAnnounce() {
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const region = document.createElement("div");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.className = "visually-hidden";
    document.body.appendChild(region);
    regionRef.current = region;
    return () => {
      region.remove();
    };
  }, []);

  return function announce(message: string) {
    const region = regionRef.current;
    if (!region) return;
    region.textContent = "";
    // Force a DOM mutation so assistive technologies reliably announce the update.
    window.requestAnimationFrame(() => {
      region.textContent = message;
    });
  };
}
