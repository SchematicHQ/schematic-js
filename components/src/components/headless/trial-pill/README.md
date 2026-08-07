# TrialPill (headless)

An unstyled, accessible, composable pill/badge for showing plan trial
information. Like the other headless components it is **controlled**: pass the
trial fields from `useSchematicPlan`; it fetches nothing and renders no visual
styling of its own.

`Root` renders **nothing** when there is no trial to display — i.e. no
`trialEndDate`/`trialStatus`, or once `trialStatus` is `"converted"`.

## Usage

### Compound components

```tsx
import { TrialPill } from "@schematichq/schematic-components";
import { useSchematicPlan } from "@schematichq/schematic-react";

function TrialBadge() {
  const plan = useSchematicPlan();

  return (
    <TrialPill.Root
      trialEndDate={plan?.trialEndDate}
      trialStatus={plan?.trialStatus}
    >
      <TrialPill.Label>Trial</TrialPill.Label>
      <TrialPill.TimeRemaining /> left · ends <TrialPill.EndDate />
    </TrialPill.Root>
  );
}
```

- `TrialPill.TimeRemaining` renders `"<amount> <units>"` (e.g. `"5 days"`),
  using the same day → hour → minute → second ladder as `useTrialEnd`.
- `TrialPill.EndDate` renders as a `<time datetime="…">` with the formatted end
  date (e.g. `"July 7, 2026"`).
- Both accept custom `children` to override their default text.

### Hook-only (custom markup / i18n)

The compound parts emit plain, un-localized strings. For translation or fully
custom rendering, use the hook and format the raw values yourself:

```tsx
import { useTrialPill } from "@schematichq/schematic-components";

const { hasTrial, isExpired, amount, units, endDateLabel } = useTrialPill({
  trialEndDate: plan?.trialEndDate,
  trialStatus: plan?.trialStatus,
});

if (!hasTrial) return null;
return <span>{t("X time left in trial", { amount, units })}</span>;
```

## Styling hooks

Every part exposes `data-schematic` / `data-part` attributes and BEM-style
classes: `schematic-trial-pill`, `__label`, `__time-remaining`, `__end-date`.
The root additionally carries `data-trial-status="active|converted|expired"`
and, when the trial has ended, `data-expired="true"` — handy for state-based
styling:

```css
.schematic-trial-pill[data-expired="true"] {
  color: var(--schematic-color-danger, crimson);
}
```
