// A minimal, dependency-free `asChild` / Slot implementation.
//
// Radix ships `@radix-ui/react-slot`, but the headless layer is governed by
// a hard tree-shake invariant and a curated peer-dep graph (see
// `scripts/check-tree-shake.mjs`). Vendoring a few dozen lines is cheaper to
// govern than adding another runtime dependency, and it keeps the
// `/headless` bundle provably self-contained.
//
// `Slot` merges its own props onto a single React element child: `className`
// is concatenated, `style` shallow-merged, `on*` handlers chained
// (child-first, so the child can `preventDefault`), and refs composed.

import * as React from "react";

type AnyProps = Record<string, unknown>;

/**
 * Fan a single node out to multiple refs (callback or object). Returns a
 * cleanup that detaches from every ref, mirroring React 19's ref-cleanup
 * contract.
 */
export function composeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node: T | null) => {
    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === "function") {
        const result = ref(node);
        if (typeof result === "function") {
          cleanups.push(result);
        }
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      for (const ref of refs) {
        if (typeof ref !== "function" && ref != null) {
          (ref as React.MutableRefObject<T | null>).current = null;
        }
      }
    };
  };
}

/**
 * Read the ref off a child element across React 18 (`element.ref`) and
 * React 19 (`element.props.ref`). The peer range is `react >= 18`, so both
 * shapes have to be handled.
 */
function getElementRef(
  element: React.ReactElement,
): React.Ref<unknown> | undefined {
  const propsRef = (element.props as { ref?: React.Ref<unknown> })?.ref;
  if (propsRef !== undefined) {
    return propsRef;
  }
  return (element as { ref?: React.Ref<unknown> }).ref;
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps };

  for (const key in childProps) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    if (
      /^on[A-Z]/.test(key) &&
      typeof slotValue === "function" &&
      typeof childValue === "function"
    ) {
      // Child handler runs first so it can `preventDefault` before ours.
      merged[key] = (...args: unknown[]) => {
        (childValue as (...a: unknown[]) => unknown)(...args);
        (slotValue as (...a: unknown[]) => unknown)(...args);
      };
    } else if (key === "style") {
      merged.style = {
        ...(slotValue as React.CSSProperties),
        ...(childValue as React.CSSProperties),
      };
    } else if (key === "className") {
      merged.className = [slotValue, childValue].filter(Boolean).join(" ");
    } else {
      // Child value wins when defined; otherwise keep the slot's value.
      merged[key] = childValue !== undefined ? childValue : slotValue;
    }
  }

  return merged;
}

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

/**
 * Clones its single React-element child, merging the Slot's props (and ref)
 * onto it. Renders `null` if `children` is not a single valid element.
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null;
    }

    const childRef = getElementRef(children);
    const childProps = (children.props ?? {}) as AnyProps;

    return React.cloneElement(children, {
      ...mergeProps(slotProps, childProps),
      ref: forwardedRef
        ? composeRefs(forwardedRef, childRef as React.Ref<HTMLElement>)
        : childRef,
    } as React.Attributes);
  },
);

Slot.displayName = "Slot";
