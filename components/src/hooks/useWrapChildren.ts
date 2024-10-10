import { useLayoutEffect, useState } from "react";

export function useWrapChildren(elements: HTMLElement[]) {
  const [shouldWrap, setShouldWrap] = useState(
    new Array(elements.length).fill(false),
  );

  useLayoutEffect(() => {
    const rowShouldWrap = (parent: Element) =>
      [...parent.children].some(
        (el) =>
          el instanceof HTMLElement &&
          el.previousElementSibling instanceof HTMLElement &&
          el.offsetLeft <= el.previousElementSibling.offsetLeft,
      );

    elements.forEach((el, idx) => {
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
  }, [elements]);

  return shouldWrap.some((wrap) => wrap === true);
}
