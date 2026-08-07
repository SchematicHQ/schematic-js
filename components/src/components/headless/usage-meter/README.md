# UsageMeter (headless)

An unstyled, accessible, composable usage meter. Unlike the styled `elements/`
components, it ships no visual styling of its own — you own the markup and CSS.
It is **controlled**: pass `value`/`max` (and optionally `min`); it fetches
nothing.

## Usage

### Compound components

```tsx
import { UsageMeter } from "@schematichq/schematic-components";
import { useSchematicEntitlement } from "@schematichq/schematic-react";

function SeatsMeter() {
  const e = useSchematicEntitlement("seats");
  if (typeof e.featureUsage !== "number" || typeof e.featureAllocation !== "number") {
    return null;
  }

  return (
    <UsageMeter.Root value={e.featureUsage} max={e.featureAllocation}>
      <UsageMeter.Label>Seats</UsageMeter.Label>
      <UsageMeter.Track>
        <UsageMeter.Fill />
      </UsageMeter.Track>
      <UsageMeter.ValueText />
    </UsageMeter.Root>
  );
}
```

### `asChild` (polymorphism)

Any part can render as your own element via `asChild`; the headless props,
attributes, and ref are merged onto the child.

```tsx
<UsageMeter.Root asChild value={usage} max={limit}>
  <section className="card">…</section>
</UsageMeter.Root>
```

### Hook-only (fully custom markup)

```tsx
import { useUsageMeter } from "@schematichq/schematic-components";

const meter = useUsageMeter({ value: usage, max: limit });
<div {...meter.getRootProps()}>
  <div {...meter.getTrackProps()}>
    <div {...meter.getFillProps()} />
  </div>
</div>;
```

## Accessibility

The root renders `role="meter"` with `aria-valuenow` / `aria-valuemin` /
`aria-valuemax` / `aria-valuetext`. Provide an accessible name either with the
`label` prop (→ `aria-label`) or by rendering `<UsageMeter.Label>` (→
`aria-labelledby`, wired automatically).

## Styling hooks

Every part exposes `data-schematic` / `data-part` attributes and BEM-style
classes: `schematic-usage-meter`, `__track`, `__fill`, `__label`,
`__value-text`. The only inline style applied is the functional
`width: <percent>%` on the fill. Suggested CSS custom properties (you supply the
stylesheet):

| Variable                            | Applies to      |
| ----------------------------------- | --------------- |
| `--schematic-meter-height`          | track height    |
| `--schematic-meter-track-background`| track background|
| `--schematic-meter-fill-background` | fill background |
| `--schematic-meter-fill-transition` | fill transition |
