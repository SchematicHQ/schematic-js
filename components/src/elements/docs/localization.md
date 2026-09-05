# Localization

Two dials, resolved independently.

**Formatting** is `locale`, a BCP 47 tag. Dates, numbers, currency and plural
categories all go through `Intl`, so the tag is the whole configuration. It
resolves from the element's `locale` prop, else the provider's, else the
viewer's language, else `en-US`. A tag `Intl` cannot take — `en_US`, with an
underscore — falls back to the default rather than throwing out of a render.

The viewer's language is read after mount, never while rendering: a server
has no `navigator`, and reading it during the render would format the
server's markup one way and the client's another. So a server-rendered page
with no explicit `locale` formats in `en-US` on both sides and adopts the
viewer's language on mount. Pass `locale` on the provider to have it right
from the first paint.

**Copy** is the host's. The elements ship English, hold no catalogue of other
languages, and take no dependency on an i18n library. Every string is
reachable by key.

## The resolution ladder

Each string resolves through four sources, first answer winning:

| Source                      | For                                                    |
| --------------------------- | ------------------------------------------------------ |
| `strings` on the element    | Renaming one string on one card.                       |
| `strings` on the provider   | Renaming or translating without an i18n stack.         |
| `translate` on the provider | The host's i18n stack — i18next, FormatJS, Lingui.     |
| `DEFAULT_STRINGS`           | The element's English. Always there; never a bare key. |

Nothing has to be configured. With none of the three, the elements render
English.

## No i18n stack: `strings`

Most hosts want to rename a string or two, in one language. That is the whole
integration:

```tsx
<SchematicProvider publishableKey="pk_…" strings={{ invoicesHeader: "Receipts" }}>
```

or per element, which wins over the provider:

```tsx
<Invoices strings={{ invoicesHeader: "Billing history" }} />
```

`STRING_KEYS` is the full key list and `ElementStrings` types it, so on an
element an editor completes the keys and a rename fails the build rather than
silently falling back. Plural spellings of a key (`invoicesCount_one`) count
as keys there too.

The provider's `strings` is a plain catalogue rather than that type — it
lives in `@schematichq/schematic-react`, which the elements depend on rather
than the other way round, so it cannot know their keys. A typo there falls
back to English silently; `onMissingString` below is how you see it.

## i18next

`translate` is shaped like `t`, so the function itself is the integration:

```tsx
import { DEFAULT_STRINGS } from "@schematichq/schematic-components/elements";

// Optional, and only for your translators' benefit: it gives them the English
// to translate from. The elements pass their own English along with every
// request, so they render correctly whether or not this ran.
i18n.addResourceBundle("en", "schematic", DEFAULT_STRINGS);

function Providers({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation("schematic");
  return (
    <SchematicProvider
      publishableKey="pk_…"
      locale={i18n.language}
      translate={t}
    >
      {children}
    </SchematicProvider>
  );
}
```

`t` changes identity when the language changes, which is what re-renders the
elements with the new copy. It costs a copy re-render and nothing else —
`translate` does not travel with the data, so no request is re-issued and no
loaded resource is dropped.

## FormatJS / react-intl

`intl.formatMessage` answers every id, so an adapter checks for the message
first and reports a miss as `undefined`:

```tsx
const intl = useIntl();
const translate = useCallback(
  (key: string, vars?: Record<string, unknown>) => {
    const id = `schematic.${key}`;
    return intl.messages[id] === undefined
      ? undefined
      : intl.formatMessage({ id }, vars as Record<string, string>);
  },
  [intl],
);
```

Lingui is the same shape: `i18n.messages[key] === undefined ? undefined : i18n.t(key, vars)`.

Your own messages are in whatever format your stack reads — ICU `{count}` for
FormatJS and Lingui, i18next's `{{count}}` for i18next. The elements' English
defaults use i18next's syntax, and only ever render on a miss.

## Plurals

A string that varies by count is declared with i18next's suffixes — `key_one`,
`key_other`, plus `_zero`, `_two`, `_few`, `_many` where a language needs them
— and asked for by its bare `key` with `{ count }`. One convention resolves
both a host's catalogue and ours:

```ts
t("invoicesCount", { count: list.count }); // "14 invoices" / "1 invoice"
```

`count` selects the form; anything else in the object is interpolated, so
`invoicesShowing` — the count while more history is loadable — takes both:

```ts
t("invoicesShowing", { count: list.count, shown: rows.length });
```

Categories come from `Intl.PluralRules`, under the language the catalogue is
written in: your overrides select under the resolved locale, and a fallback to
our English selects under English rules however the page is localized.

## Reporting a miss

`onMissingString` fires for every key that fell back to English, which turns a
mis-wired catalogue into a log line rather than a visual diff:

```tsx
<SchematicProvider
  publishableKey="pk_…"
  translate={t}
  onMissingString={(key) => console.warn(`[schematic] untranslated: ${key}`)}
/>
```

It is detected by handing `translate` a sentinel `defaultValue` and reading it
back, so a stack that answers every key with something still reports honestly.
It fires during render — log from it, do not set state.

## The catalogue file

`@schematichq/schematic-components/elements/locales/en.json` is the English copy in
ARB, the message format translation tools read: each message, and an
`@key.description` saying where it appears and what constrains it. Hand that
file to translators or a TMS rather than scraping `DEFAULT_STRINGS`.

## A different locale for one subtree

`SchematicI18nProvider` nests and merges, so a subtree can override one field
and inherit the rest:

```tsx
<SchematicProvider publishableKey="pk_…" locale="en-US" translate={t}>
  <Invoices />
  <PreviewPane>
    {/* formats in French; still translated by the same `t` */}
    <SchematicI18nProvider locale="fr-FR">
      <Invoices />
    </SchematicI18nProvider>
  </PreviewPane>
</SchematicProvider>
```

It also works with no data provider above it.

## Rendering your own markup

The hooks are a first-class surface, so the pieces an element uses are
exported:

```tsx
import {
  deriveInvoiceList,
  useInvoices,
  useResolvedLocale,
  useTranslator,
} from "@schematichq/schematic-components/elements";

function History() {
  const { data: page } = useInvoices();
  const locale = useResolvedLocale(); // the same tag an element would format in
  const t = useTranslator(); // the same copy an element would render
  if (page === undefined) return null;

  const { count, rows } = deriveInvoiceList(page, { locale });
  return (
    <>
      <h2>{t("invoicesHeader")}</h2>
      <p>
        {rows.length < count
          ? t("invoicesShowing", { count, shown: rows.length })
          : t("invoicesCount", { count })}
      </p>
    </>
  );
}
```

Each row carries the raw value beside the formatted text — `amountMinor`,
`currency` and `date` next to `amountText` and `dateText` — and
`deriveInvoiceList` takes per-field `format` overrides, so formatting
differently never means abandoning the derivation:

```tsx
deriveInvoiceList(page, {
  locale,
  format: {
    // Accounting parentheses, which the default text leaves to `isCredit`.
    amount: (minor, currency, locale) =>
      minor < 0
        ? `(${formatCurrency(-minor, currency, locale)})`
        : formatCurrency(minor, currency, locale),
  },
});
```

## Right-to-left

The stylesheet uses logical properties, so an RTL locale lays out from the
other edge with no extra CSS. Set `dir` on an ancestor as you would for the
rest of the page; the elements do not set it themselves.

## Why copy has its own provider

`locale`, `translate`, `strings` and `onMissingString` live on their own
context, not on the company data source. A host's `t` changes identity every
time its language does, and an inline `translate={(k, v) => t(k, v)}` changes
it on every render. On the data source, each change would rebuild the source
and its snapshot cache, and `useSyncExternalStore` would read a new handle on
every render — the shape React warns about with "The result of getSnapshot
should be cached to avoid an infinite loop." Kept apart, copy and data change
independently: a language switch re-renders the elements, drops no loaded
resource, and re-issues no request. `react/src/i18n/i18n.spec.tsx` holds that
line.
