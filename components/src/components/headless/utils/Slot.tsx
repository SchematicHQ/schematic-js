import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactNode,
  type Ref,
} from "react";

import { mergeProps } from "./mergeProps";

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref != null) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

/**
 * Combine multiple refs into a single ref callback so the same node can be
 * forwarded to several owners (e.g. the part's own ref plus the child's ref
 * when composing with `asChild`).
 */
export function composeRefs<T>(
  ...refs: (Ref<T> | undefined)[]
): (node: T | null) => void {
  return (node) => {
    refs.forEach((ref) => setRef(ref, node));
  };
}

export interface SlotProps {
  children?: ReactNode;
}

/**
 * Renders no DOM of its own: clones its single child element and merges the
 * injected props (and ref) onto it via {@link mergeProps}. This powers the
 * `asChild` pattern, letting consumers render a part as their own element while
 * still receiving the headless behavior/attributes.
 *
 * Ref handling supports both React 18 (`element.ref`) and React 19 (ref passed
 * as a normal `props.ref`).
 */
export const Slot = forwardRef<HTMLElement, SlotProps & Record<string, unknown>>(
  ({ children, ...slotProps }, ref) => {
    if (!isValidElement(children)) {
      return null;
    }

    const { ref: childRef, ...childProps } = children.props as Record<
      string,
      unknown
    > & { ref?: Ref<HTMLElement> };

    const merged = mergeProps(slotProps, childProps);

    return cloneElement(children, {
      ...merged,
      ref: composeRefs(
        ref,
        childRef ?? (children as { ref?: Ref<HTMLElement> }).ref,
      ),
    } as Record<string, unknown>);
  },
);

Slot.displayName = "Slot";
