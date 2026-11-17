import {
  useCompany,
  useCreditBalances,
  useCreditSpendPolicies,
  useCreditUserUsage,
  type Company,
} from "@schematichq/schematic-react";
import { useId, useMemo, useState } from "react";

import {
  Dialog,
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveUsageControls,
  featureName,
  formatCredits,
  formatDate,
  httpStatus,
  nextReset,
  takenCaps,
  windowUnitFor,
  type UsageControlRow,
  type UsageControlsView,
  type UsageCreditOption,
  type UsagePeriod,
} from "./model";
import type { StringKey, Translator } from "./strings";

export interface UsageControlsProps extends ElementProps {
  /** Credit ids whose limits to show and add; every credit when absent. */
  credits?: string[];
  /**
   * Shows Add and Edit. Default false: any session can write limits, so the
   * host turns this on for the people it lets manage them.
   */
  allowEdit?: boolean;
  /** The "Usage controls" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
}

const PERIODS: readonly UsagePeriod[] = ["hour", "day", "week", "month"];

const PERIOD_LABEL: Record<UsagePeriod, StringKey> = {
  hour: "usageControlsHourly",
  day: "usageControlsDaily",
  week: "usageControlsWeekly",
  month: "usageControlsMonthly",
};

const PREVIEW_PERIOD: Record<UsagePeriod, StringKey> = {
  hour: "usageControlsPreviewHour",
  day: "usageControlsPreviewDay",
  week: "usageControlsPreviewWeek",
  month: "usageControlsPreviewMonth",
};

const CAP_TEXT: Record<
  NonNullable<UsageControlRow["period"]> | "perUse",
  StringKey
> = {
  hour: "usageControlsPerHour",
  day: "usageControlsPerDay",
  week: "usageControlsPerWeek",
  month: "usageControlsPerMonth",
  calendarMonth: "usageControlsPerCalendarMonth",
  billingPeriod: "usageControlsPerBillingPeriod",
  perUse: "usageControlsPerUse",
};

const SKELETON_ROWS = 3;

/** An open dialog: a new limit, or the row being edited. */
type Editing = { mode: "add" } | { mode: "edit"; row: UsageControlRow };

/**
 * The limits on the company's credit spend: caps on the whole company and on
 * single members, per period or per use, each with what is spent of it and
 * when it resets. With `allowEdit`, Add and Edit open a dialog that offers
 * only the caps the API will take.
 *
 * Renders nothing without a session, when the account has spend policies
 * turned off, and when the company holds no credits and has no limits.
 */
export function UsageControls({
  allowEdit = false,
  className,
  credits,
  headingLevel = 2,
  locale: localeProp,
  showHeader = true,
  strings,
}: UsageControlsProps) {
  const policies = useCreditSpendPolicies({ credits });
  const balances = useCreditBalances();
  const company = useCompany();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const [editing, setEditing] = useState<Editing | null>(null);

  const balancesSettled =
    balances.data !== undefined || balances.error !== undefined;
  const view = useMemo(
    () =>
      policies.data === undefined || !balancesSettled
        ? undefined
        : deriveUsageControls(policies.data, balances.data, {
            credits,
            locale,
          }),
    [balances.data, balancesSettled, credits, locale, policies.data],
  );

  const status = httpStatus(policies.error);
  const signedOut =
    policies.data === undefined &&
    policies.error === undefined &&
    !policies.isPending;
  if (
    signedOut ||
    (policies.data === undefined && (status === 403 || status === 404)) ||
    (view !== undefined &&
      view.rows.length === 0 &&
      view.creditOptions.length === 0)
  ) {
    return null;
  }

  const companyName = company.data?.name;
  const scopeName = (row: UsageControlRow) =>
    row.userId === null
      ? companyName === undefined || companyName === ""
        ? t("usageControlsEveryone")
        : t("usageControlsEveryoneAt", { company: companyName })
      : (row.userName ?? t("usageControlsUnknownUser"));
  const canAdd =
    allowEdit && view !== undefined && view.creditOptions.length > 0;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-usage-controls", className)}
      error={policies.error}
      errorMessage={
        policies.error === undefined ? undefined : t("usageControlsError")
      }
      hasData={view !== undefined}
      isPending={view === undefined}
      loadingLabel={t("usageControlsLoading")}
      onRetry={policies.refetch}
      retryText={t("retry")}
      skeleton={<UsageControlsSkeleton showHeader={showHeader} />}
    >
      {view !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title" id={headingId}>
                {t("usageControlsHeader")}
              </Heading>
              {view.credit !== null && (
                <span className="schematic-muted schematic-small schematic-usage-controls__credit-name">
                  {view.credit.name}
                </span>
              )}
            </div>
          )}
          {view.rows.length === 0 ? (
            <div className="schematic-usage-controls__empty">
              <p className="schematic-usage-controls__empty-title">
                {t("usageControlsEmpty")}
              </p>
              <p className="schematic-muted schematic-small schematic-usage-controls__empty-note">
                {t("usageControlsEmptyNote")}
              </p>
            </div>
          ) : (
            <ul
              className="schematic-usage-controls__list"
              aria-label={showHeader ? undefined : t("usageControlsHeader")}
              aria-labelledby={showHeader ? headingId : undefined}
            >
              {view.rows.map((row) => (
                <LimitRow
                  allowEdit={allowEdit}
                  key={row.id}
                  locale={locale}
                  row={row}
                  scope={scopeName(row)}
                  showCredit={view.credit === null}
                  t={t}
                  onEdit={() => setEditing({ mode: "edit", row })}
                />
              ))}
            </ul>
          )}
          {canAdd && (
            <button
              className="schematic-cta schematic-cta--small schematic-cta--outline schematic-usage-controls__add"
              type="button"
              onClick={() => setEditing({ mode: "add" })}
            >
              {t("usageControlsAdd")}
            </button>
          )}
          {editing !== null && (
            <LimitDialog
              company={company.data}
              create={policies.create}
              editing={editing}
              locale={locale}
              remove={policies.remove}
              scopeName={scopeName}
              t={t}
              update={policies.update}
              view={view}
              onClose={() => setEditing(null)}
            />
          )}
        </>
      )}
    </StatusFrame>
  );
}

function LimitRow({
  allowEdit,
  locale,
  onEdit,
  row,
  scope,
  showCredit,
  t,
}: {
  allowEdit: boolean;
  locale: string;
  onEdit: () => void;
  row: UsageControlRow;
  scope: string;
  showCredit: boolean;
  t: Translator;
}) {
  return (
    <li
      className="schematic-usage-controls__row"
      data-status={row.status}
      data-testid="schematic-usage-control"
    >
      <div className="schematic-usage-controls__top">
        <span className="schematic-usage-controls__what">
          <span className="schematic-usage-controls__scope">
            {scope}
            {showCredit && (
              <span className="schematic-muted schematic-small schematic-usage-controls__row-credit">
                {" · "}
                {row.creditName}
              </span>
            )}
          </span>
          {row.status !== "ok" && (
            <span
              className={cx(
                "schematic-chip",
                "schematic-usage-controls__status",
                `schematic-usage-controls__status--${row.status}`,
              )}
            >
              {t(
                row.status === "reached"
                  ? "usageControlsLimitReached"
                  : "usageControlsNearLimit",
                { limit: row.limitText, used: row.consumedText ?? "" },
              )}
            </span>
          )}
        </span>
        <span className="schematic-usage-controls__end">
          {allowEdit && (
            <button
              aria-label={t("usageControlsEditLabel", {
                cap: capText(row, t),
                scope,
              })}
              className="schematic-link-button schematic-usage-controls__edit"
              type="button"
              onClick={onEdit}
            >
              {t("usageControlsEdit")}
            </button>
          )}
        </span>
      </div>
      <span className="schematic-muted schematic-small schematic-usage-controls__cap">
        {capText(row, t)}
      </span>
      {row.resetsAt !== null && (
        <span className="schematic-muted schematic-small schematic-usage-controls__resets">
          {t("usageControlsResets", {
            when: resetText(row.resetsAt, row.period, locale),
          })}
        </span>
      )}
    </li>
  );
}

function LimitDialog({
  company,
  create,
  editing,
  locale,
  onClose,
  remove,
  scopeName,
  t,
  update,
  view,
}: {
  company: Company | undefined;
  create: ReturnType<typeof useCreditSpendPolicies>["create"];
  editing: Editing;
  locale: string;
  onClose: () => void;
  remove: ReturnType<typeof useCreditSpendPolicies>["remove"];
  scopeName: (row: UsageControlRow) => string;
  t: Translator;
  update: ReturnType<typeof useCreditSpendPolicies>["update"];
  view: UsageControlsView;
}) {
  const row = editing.mode === "edit" ? editing.row : undefined;
  const [creditId, setCreditId] = useState(
    row?.creditId ?? view.creditOptions[0]?.id ?? "",
  );
  const [userId, setUserId] = useState<string | null>(row?.userId ?? null);
  const [person, setPerson] = useState(
    row !== undefined && row.userId !== null,
  );
  const [kind, setKind] = useState<UsageControlRow["kind"]>(
    row?.kind ?? "window",
  );
  const initialPeriod = row === undefined ? undefined : dialogPeriodOf(row);
  // No person picked yet blocks nothing: the company's caps are not theirs.
  const taken =
    person && userId === null
      ? { periods: new Set<UsagePeriod>(), perUse: false }
      : takenCaps(
          view.rows,
          { creditId, userId: person ? userId : null },
          row?.id,
        );
  const [period, setPeriod] = useState<UsagePeriod>(
    initialPeriod ?? PERIODS.find((p) => !taken.periods.has(p)) ?? "day",
  );
  const [amount, setAmount] = useState(
    row === undefined ? "" : String(row.limit),
  );
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StringKey | null>(null);
  const titleId = useId();
  const fieldId = useId();

  const users = useCreditUserUsage(creditId);
  const people = (users.data?.users ?? []).filter((u) => u.name != null);

  const value = Number(amount);
  const validAmount =
    amount.trim() !== "" && Number.isFinite(value) && value > 0;
  const scopeUserId = person ? userId : null;
  // The row's own period stays open on edit even where a sibling now holds
  // its dialog slot: a company calendar-month cap reads as Monthly.
  const isTaken = (p: UsagePeriod) =>
    p !== initialPeriod && taken.periods.has(p);
  const periodTaken = kind === "window" && isTaken(period);
  const kindTaken = kind === "perUse" && taken.perUse;
  const canSave =
    !busy &&
    validAmount &&
    creditId !== "" &&
    (!person || userId !== null) &&
    !periodTaken &&
    !kindTaken;

  const creditOption: UsageCreditOption | undefined =
    view.creditOptions.find((c) => c.id === creditId) ??
    (row === undefined
      ? undefined
      : { id: row.creditId, name: row.creditName });
  const unit = (n: number) =>
    featureName({ name: creditOption?.name ?? "" }, n, locale);

  const preview = !validAmount
    ? undefined
    : kind === "perUse"
      ? t("usageControlsPreviewPerUse", {
          amount: formatCredits(value, locale),
          credits: unit(value),
        })
      : t("usageControlsPreviewWindow", {
          amount: formatCredits(value, locale),
          credits: unit(value),
          period: t(PREVIEW_PERIOD[period]),
          when: resetText(
            nextReset(period, scopeUserId, company, new Date()),
            period,
            locale,
          ),
        });

  const run = async (write: () => Promise<void>, errorKey: StringKey) => {
    setBusy(true);
    setFailure(null);
    try {
      await write();
      onClose();
    } catch (cause: unknown) {
      setFailure(
        httpStatus(cause instanceof Error ? cause : undefined) === 409
          ? "usageControlsDuplicateError"
          : errorKey,
      );
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!canSave) {
      return;
    }
    if (row === undefined) {
      void run(
        () =>
          create({
            creditId,
            ...(scopeUserId === null ? {} : { userId: scopeUserId }),
            ...(kind === "perUse"
              ? { maxPerDraw: value }
              : {
                  windowAmount: value,
                  windowUnit: windowUnitFor(period, scopeUserId),
                }),
          }),
        "usageControlsSaveError",
      );
      return;
    }
    // An unchanged period is left off, so a company cap on the calendar
    // month keeps its window rather than moving to the plan period.
    void run(
      () =>
        update(
          row.id,
          row.kind === "perUse"
            ? { maxPerDraw: value }
            : {
                windowAmount: value,
                ...(period === initialPeriod
                  ? {}
                  : {
                      windowUnit: windowUnitFor(period, row.userId),
                    }),
              },
        ),
      "usageControlsSaveError",
    );
  };

  return (
    <Dialog
      className="schematic-usage-controls__dialog"
      closeLabel={t("usageControlsClose")}
      open
      title={
        row === undefined
          ? t("usageControlsAddTitle")
          : t("usageControlsEditTitle")
      }
      titleId={titleId}
      onClose={onClose}
    >
      <form
        className="schematic-usage-controls__form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {row === undefined ? (
          <>
            {view.creditOptions.length > 1 && (
              <Field
                htmlFor={`${fieldId}-credit`}
                label={t("usageControlsCredit")}
              >
                <select
                  className="schematic-select schematic-usage-controls__input"
                  id={`${fieldId}-credit`}
                  value={creditId}
                  onChange={(event) => {
                    setCreditId(event.target.value);
                    setUserId(null);
                  }}
                >
                  {view.creditOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t("usageControlsAppliesTo")}>
              <Toggle
                options={[
                  { value: false, label: t("usageControlsEveryone") },
                  { value: true, label: t("usageControlsOnePerson") },
                ]}
                value={person}
                onChange={setPerson}
              />
            </Field>
            {person && (
              <Field
                htmlFor={`${fieldId}-person`}
                label={t("usageControlsPerson")}
              >
                {people.length === 0 && users.data !== undefined ? (
                  <p className="schematic-muted schematic-small schematic-usage-controls__note">
                    {t("usageControlsNoPeople")}
                  </p>
                ) : (
                  <select
                    className="schematic-select schematic-usage-controls__input"
                    id={`${fieldId}-person`}
                    value={userId ?? ""}
                    onChange={(event) =>
                      setUserId(
                        event.target.value === "" ? null : event.target.value,
                      )
                    }
                  >
                    <option value="">{t("usageControlsChoosePerson")}</option>
                    {people.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
            <Field label={t("usageControlsKind")}>
              <Toggle
                options={[
                  { value: "window", label: t("usageControlsKindWindow") },
                  {
                    value: "perUse",
                    label: t("usageControlsKindPerUse"),
                    disabled: taken.perUse,
                  },
                ]}
                value={kind}
                onChange={setKind}
              />
            </Field>
          </>
        ) : (
          <p className="schematic-usage-controls__fixed">
            <span className="schematic-usage-controls__fixed-scope">
              {scopeName(row)}
            </span>
            <span className="schematic-muted schematic-small">
              {row.creditName}
              {" · "}
              {row.kind === "perUse"
                ? t("usageControlsKindPerUse")
                : t("usageControlsKindWindow")}
            </span>
          </p>
        )}
        {kind === "window" && (
          <Field label={t("usageControlsPeriod")}>
            <Toggle
              options={PERIODS.map((p) => ({
                value: p,
                label: t(PERIOD_LABEL[p]),
                disabled: isTaken(p),
                title: isTaken(p) ? t("usageControlsTaken") : undefined,
              }))}
              value={period}
              onChange={setPeriod}
            />
          </Field>
        )}
        <Field htmlFor={`${fieldId}-amount`} label={t("usageControlsAmount")}>
          <input
            className="schematic-usage-controls__input"
            id={`${fieldId}-amount`}
            inputMode="decimal"
            min="0"
            step="any"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        {preview !== undefined && (
          <p
            aria-live="polite"
            className="schematic-muted schematic-small schematic-usage-controls__preview"
          >
            {preview}
          </p>
        )}
        {failure !== null && (
          <p
            className="schematic-error schematic-usage-controls__failure"
            role="alert"
          >
            {t(failure)}
          </p>
        )}
        <div className="schematic-usage-controls__actions">
          {row !== undefined &&
            (confirmingRemove ? (
              <span className="schematic-usage-controls__confirm">
                <span>{t("usageControlsRemoveConfirm")}</span>
                <button
                  className="schematic-cta schematic-cta--small schematic-usage-controls__remove-yes"
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void run(() => remove(row.id), "usageControlsRemoveError")
                  }
                >
                  {t("usageControlsRemoveYes")}
                </button>
                <button
                  className="schematic-cta schematic-cta--small schematic-cta--ghost"
                  disabled={busy}
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                >
                  {t("usageControlsRemoveNo")}
                </button>
              </span>
            ) : (
              <button
                className="schematic-link-button schematic-usage-controls__remove"
                disabled={busy}
                type="button"
                onClick={() => setConfirmingRemove(true)}
              >
                {t("usageControlsRemove")}
              </button>
            ))}
          {!confirmingRemove && (
            <span className="schematic-usage-controls__actions-end">
              <button
                className="schematic-cta schematic-cta--small schematic-cta--ghost"
                type="button"
                onClick={onClose}
              >
                {t("usageControlsCancel")}
              </button>
              <button
                className="schematic-cta schematic-cta--small"
                disabled={!canSave}
                type="submit"
              >
                {t("usageControlsSave")}
              </button>
            </span>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  label: string;
}) {
  const labelId = useId();
  return (
    <div className="schematic-usage-controls__field">
      {htmlFor === undefined ? (
        <span className="schematic-usage-controls__label" id={labelId}>
          {label}
        </span>
      ) : (
        <label className="schematic-usage-controls__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {htmlFor === undefined ? (
        <div aria-labelledby={labelId} role="group">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Toggle<V extends string | boolean>({
  onChange,
  options,
  value,
}: {
  onChange: (value: V) => void;
  options: { value: V; label: string; disabled?: boolean; title?: string }[];
  value: V;
}) {
  return (
    <div className="schematic-toggle schematic-usage-controls__toggle">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className="schematic-toggle__option"
          disabled={option.disabled === true}
          key={String(option.value)}
          title={option.title}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function capText(row: UsageControlRow, t: Translator): string {
  return t(CAP_TEXT[row.kind === "perUse" ? "perUse" : (row.period ?? "day")], {
    amount: row.limitText,
    credits: row.unitName,
  });
}

/** A time for windows of a day or less, a date for longer ones. */
function resetText(
  date: Date,
  period: UsageControlRow["period"] | UsagePeriod,
  locale: string,
): string {
  if (period === "hour" || period === "day") {
    return formatDate(date, locale, {
      day: undefined,
      hour: "numeric",
      minute: "2-digit",
      month: undefined,
      year: undefined,
    });
  }
  return formatDate(date, locale, { month: "short", year: undefined });
}

/** The dialog period a row's window shows as; a company calendar month reads as Monthly. */
function dialogPeriodOf(row: UsageControlRow): UsagePeriod | undefined {
  switch (row.period) {
    case null:
      return undefined;
    case "billingPeriod":
    case "calendarMonth":
      return "month";
    default:
      return row.period;
  }
}

function UsageControlsSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div className="schematic-skeleton__row" key={row}>
          <div className="schematic-skeleton__cell" data-column="scope" />
          <div className="schematic-skeleton__cell" data-column="limit" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
UsageControls.resources = [
  "spendPolicies",
  "creditBalances",
  "company",
] as const;

export default UsageControls;
