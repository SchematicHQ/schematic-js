import { useLayoutEffect, useState } from "react";

export function useWrapChildren(ref: React.RefObject<HTMLElement[]>) {
  const [shouldWrap, setShouldWrap] = useState<boolean[]>([]);

  useLayoutEffect(() => {
    const rowShouldWrap = (parent: Element) =>
      [...parent.children].some(
        (el) =>
          el instanceof HTMLElement &&
          el.previousElementSibling instanceof HTMLElement &&
          el.offsetLeft <= el.previousElementSibling.offsetLeft,
      );

    ref.current.forEach((el, idx) => {
      new ResizeObserver((entries) => {
        setShouldWrap((prev) => {
          const next = [...prev];
          next[idx] = entries.some((entry) => rowShouldWrap(entry.target));
          return next;
        });
      }).observe(el);

      setShouldWrap((prev) => {
        const next = [...prev];
        next[idx] = rowShouldWrap(el);
        return next;
      });
    });
  }, [ref]);

  return shouldWrap.some((wrap) => wrap);
}
