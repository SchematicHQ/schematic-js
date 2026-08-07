import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ElementType,
} from "react";

import { Slot, createHeadlessContext, mergeProps } from "../utils";

import { useUsageMeter, type UsageMeterApi } from "./useUsageMeter";

interface UsageMeterContextValue extends UsageMeterApi {
  /** Registers/clears the id of the `<Label>` for `aria-labelledby` wiring. */
  registerLabel: (id: string | undefined) => void;
}

const [UsageMeterProvider, useUsageMeterContext] =
  createHeadlessContext<UsageMeterContextValue>(
    "UsageMeter parts must be used within <UsageMeter.Root>",
  );

/** Props shared by every non-root part. */
export interface UsageMeterPartProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as the single child element instead of the default DOM node. */
  asChild?: boolean;
}

export interface UsageMeterRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current usage value (e.g. `entitlement.featureUsage`). */
  value: number;
  /** Maximum/allocation value (e.g. `entitlement.featureAllocation`). */
  max: number;
  /** Minimum of the range. Defaults to `0`. */
  min?: number;
  /** Accessible name applied as `aria-label` when no `<Label>` is used. */
  label?: string;
  asChild?: boolean;
}

const Root = forwardRef<HTMLDivElement, UsageMeterRootProps>(
  ({ value, max, min, label, asChild, className, children, ...rest }, ref) => {
    const [labelId, setLabelId] = useState<string>();
    const api = useUsageMeter({ value, max, min, label, labelId });
    const registerLabel = useCallback(
      (id: string | undefined) => setLabelId(id),
      [],
    );
    const contextValue = useMemo<UsageMeterContextValue>(
      () => ({ ...api, registerLabel }),
      [api, registerLabel],
    );

    const props = mergeProps(
      { ...api.getRootProps(), className: "schematic-usage-meter" },
      { className, ...rest },
    );

    const Comp = (asChild ? Slot : "div") as ElementType;

    return (
      <UsageMeterProvider value={contextValue}>
        <Comp ref={ref} {...props}>
          {children}
        </Comp>
      </UsageMeterProvider>
    );
  },
);

Root.displayName = "UsageMeter.Root";

const Track = forwardRef<HTMLDivElement, UsageMeterPartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getTrackProps } = useUsageMeterContext();
    const props = mergeProps(
      { ...getTrackProps(), className: "schematic-usage-meter__track" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Track.displayName = "UsageMeter.Track";

const Fill = forwardRef<HTMLDivElement, UsageMeterPartProps>(
  ({ asChild, className, style, children, ...rest }, ref) => {
    const { getFillProps } = useUsageMeterContext();
    const props = mergeProps(
      { ...getFillProps(), className: "schematic-usage-meter__fill" },
      { className, style, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Fill.displayName = "UsageMeter.Fill";

const Label = forwardRef<HTMLSpanElement, UsageMeterPartProps>(
  ({ asChild, className, children, id: idProp, ...rest }, ref) => {
    const { getLabelProps, registerLabel } = useUsageMeterContext();
    const generatedId = useId();
    const id = idProp ?? generatedId;

    useEffect(() => {
      registerLabel(id);
      return () => registerLabel(undefined);
    }, [registerLabel, id]);

    const props = mergeProps(
      { ...getLabelProps(), id, className: "schematic-usage-meter__label" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "span") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Label.displayName = "UsageMeter.Label";

const ValueText = forwardRef<HTMLSpanElement, UsageMeterPartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getValueTextProps } = useUsageMeterContext();
    const props = mergeProps(
      {
        ...getValueTextProps(),
        className: "schematic-usage-meter__value-text",
      },
      {
        className,
        // only override the default (percent) text when children are provided
        ...(children !== undefined ? { children } : {}),
        ...rest,
      },
    );
    const Comp = (asChild ? Slot : "span") as ElementType;
    return <Comp ref={ref} {...props} />;
  },
);

ValueText.displayName = "UsageMeter.ValueText";

/**
 * Headless, composable usage meter. Unstyled by default — theme it with the
 * `schematic-usage-meter*` classes, `data-part` attributes, or the documented
 * CSS custom properties (see the folder README).
 *
 * @example
 * ```tsx
 * const e = useSchematicEntitlement("seats");
 * <UsageMeter.Root value={e.featureUsage} max={e.featureAllocation}>
 *   <UsageMeter.Label>Seats</UsageMeter.Label>
 *   <UsageMeter.Track>
 *     <UsageMeter.Fill />
 *   </UsageMeter.Track>
 *   <UsageMeter.ValueText />
 * </UsageMeter.Root>
 * ```
 */
export const UsageMeter = {
  Root,
  Track,
  Fill,
  Label,
  ValueText,
};

export { useUsageMeterContext };
