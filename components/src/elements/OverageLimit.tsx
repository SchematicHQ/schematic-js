import {
  useOverageLimit,
  type CreditOverdraft,
} from "@schematichq/schematic-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  StatusFrame,
  cx,
  isDevelopment,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveOverageLimit,
  httpStatus,
  overageLimitInputText,
  overageMoney,
  serverMessage,
  validateOverageLimit,
  type OverageLimitInputError,
  type OverageLimitSource,
  type OverageLimitTone,
  type OverageLimitView,
} from "./model";
import type { StringKey, Translator } from "./strings";

export interface OverageLimitProps extends ElementProps {
  /** The credit to show; the company's only credit with an overage limit when absent. */
  creditId?: string;
  /** Change and reset, where the plan allows them. Default true. */
  allowEdit?: boolean;
  /** The meter and the extra credits used. Default true. */
  showUsage?: boolean;
  /** Percent of the limit used that turns the card amber. Default 80. */
  warnAt?: number;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** Called once a new limit or a reset has saved. */
  onSaved?: () => void;
}

const SOURCE_KEY: Record<OverageLimitSource, StringKey> = {
  company: "overageLimitSourceCompany",
  plan: "overageLimitSourcePlan",
  planDefault: "overageLimitSourcePlanDefault",
  provider: "overageLimitSourceProvider",
};

const METER_TONE: Record<OverageLimitTone, string | undefined> = {
  ok: undefined,
  warning: "schematic-meter--warning",
  blocked: "schematic-meter--over",
};

const INPUT_ERROR_KEY: Record<OverageLimitInputError, StringKey> = {
  aboveMax: "overageLimitAboveMax",
  invalid: "overageLimitInvalid",
};

type Write = "save" | "reset";

/**
 * How far past zero a credit the plan bills in arrears may go before usage
 * pauses: the limit in force, what it would cost, and how much of it this
 * period has used, turning amber near the limit and red at it. Where the
 * plan allows, the company changes the limit in place or returns it to the
 * plan's default.
 *
 * Renders nothing for a company with no such credit, or with several and
 * no `creditId`.
 */
export function OverageLimit({
  allowEdit = true,
  className,
  creditId,
  headingLevel = 2,
  locale: localeProp,
  onSaved,
  showUsage = true,
  strings,
  warnAt,
}: OverageLimitProps) {
  const {
    ambiguous,
    data,
    error,
    isMutating,
    isPending,
    mutationError,
    refetch,
    reset,
    save,
  } = useOverageLimit({ creditId });
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [editing, setEditing] = useState(false);
  const [lastWrite, setLastWrite] = useState<Write | null>(null);

  const view = useMemo(
    () =>
      data === undefined || data === null
        ? undefined
        : deriveOverageLimit(data, { allowEdit, locale, warnAt }),
    [allowEdit, data, locale, warnAt],
  );

  useEffect(() => {
    if (isDevelopment && ambiguous) {
      console.warn(
        "Schematic: OverageLimit renders nothing: several credits have an overage limit; pass `creditId`.",
      );
    }
  }, [ambiguous]);

  if (
    data === null ||
    (data === undefined && !isPending && error === undefined)
  ) {
    return null;
  }

  const write = async (kind: Write, action: () => Promise<void>) => {
    setLastWrite(kind);
    try {
      await action();
    } catch {
      return;
    }
    setEditing(false);
    setLastWrite(null);
    onSaved?.();
  };

  const writeError =
    lastWrite === null || mutationError === undefined
      ? undefined
      : (serverMessage(mutationError) ??
        t(
          lastWrite === "save"
            ? "overageLimitSaveError"
            : "overageLimitResetError",
        ));

  const unavailable = view === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("overageLimitUnavailable")
        : t("overageLimitError");

  const Heading = `h${headingLevel}` as const;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-overage-limit", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={view !== undefined}
      isPending={isPending}
      loadingLabel={t("overageLimitLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<OverageLimitSkeleton />}
    >
      {view !== undefined && data !== undefined && (
        <>
          <div className="schematic-header">
            <Heading className="schematic-header__title">
              {t("overageLimitHeader")}
            </Heading>
          </div>
          <div className="schematic-row">
            <span className="schematic-row__label schematic-overage-limit__credit">
              {view.name}
            </span>
            {view.rate !== null && (
              <span className="schematic-muted schematic-row__value schematic-overage-limit__rate">
                {t("overageLimitRate", { rate: view.rate, unit: view.unit })}
              </span>
            )}
          </div>
          {editing ? (
            <OverageLimitForm
              error={writeError}
              isMutating={isMutating}
              locale={locale}
              overdraft={data.overdraft}
              t={t}
              view={view}
              onCancel={() => {
                setEditing(false);
                setLastWrite(null);
              }}
              onReset={() => void write("reset", reset)}
              onSave={(limit) =>
                void write("save", () => save({ overdraftLimit: limit }))
              }
            />
          ) : (
            <>
              <div className="schematic-overage-limit__summary">
                <p className="schematic-overage-limit__limit">
                  {view.limit === null
                    ? t("overageLimitNoLimit")
                    : t("overageLimitAmount", view.limit)}
                </p>
                <p className="schematic-muted schematic-small schematic-overage-limit__source">
                  {[
                    view.limit === null || view.limit.money === null
                      ? undefined
                      : t("overageLimitAbout", { amount: view.limit.money }),
                    t(SOURCE_KEY[view.source]),
                  ]
                    .filter((part) => part !== undefined)
                    .join(" · ")}
                </p>
              </div>
              {showUsage && view.hasUsage ? (
                <Usage t={t} view={view} />
              ) : (
                <p className="schematic-muted schematic-small schematic-overage-limit__explainer">
                  {t(
                    view.limit === null
                      ? "overageLimitExplainerNoLimit"
                      : "overageLimitExplainer",
                  )}
                </p>
              )}
              <Note t={t} view={view} />
              <Actions
                isMutating={isMutating}
                showUsage={showUsage}
                t={t}
                view={view}
                onEdit={() => {
                  setLastWrite(null);
                  setEditing(true);
                }}
                onReset={() => void write("reset", reset)}
              />
              {writeError !== undefined && (
                <p
                  className="schematic-status-note schematic-error"
                  role="alert"
                >
                  {writeError}
                </p>
              )}
            </>
          )}
        </>
      )}
    </StatusFrame>
  );
}

function Usage({ t, view }: { t: Translator; view: OverageLimitView }) {
  return (
    <div className="schematic-overage-limit__usage">
      {view.limit !== null && (
        <div
          aria-label={t("overageLimitUsed", view.used)}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={view.percent}
          className={cx("schematic-meter", METER_TONE[view.tone])}
          role="meter"
        >
          <div
            className="schematic-meter__fill"
            style={{ width: `${view.percent}%` }}
          />
        </div>
      )}
      <div className="schematic-row schematic-small">
        <span className="schematic-overage-limit__used">
          {[t("overageLimitUsed", view.used), view.used.money]
            .filter((part) => part !== null)
            .join(" · ")}
        </span>
        {view.left !== null && (
          <span
            className={cx(
              "schematic-row__value",
              "schematic-overage-limit__left",
              view.tone === "ok" && "schematic-muted",
              view.tone === "warning" && "schematic-overage-limit__warning",
              view.tone === "blocked" && "schematic-error",
            )}
          >
            {t("overageLimitLeft", { amount: view.left })}
          </span>
        )}
      </div>
    </div>
  );
}

function Note({ t, view }: { t: Translator; view: OverageLimitView }) {
  if (view.tone === "warning" && view.limit !== null) {
    return (
      <p className="schematic-small schematic-overage-limit__note">
        {t("overageLimitWarning", view.limit)}
      </p>
    );
  }
  if (view.tone === "blocked") {
    return (
      <>
        <p className="schematic-error schematic-small schematic-overage-limit__note">
          {t(
            view.canRaise ? "overageLimitBlocked" : "overageLimitBlockedLocked",
          )}
        </p>
        {view.resetsOn !== null && (
          <p className="schematic-muted schematic-small schematic-overage-limit__note">
            {t("overageLimitRenews", { date: view.resetsOn })}
          </p>
        )}
      </>
    );
  }
  if (view.planLocked) {
    return (
      <p className="schematic-muted schematic-small schematic-overage-limit__note">
        {t(
          view.source === "provider"
            ? "overageLimitProviderSets"
            : "overageLimitPlanSets",
        )}
      </p>
    );
  }
  return null;
}

function Actions({
  isMutating,
  onEdit,
  onReset,
  showUsage,
  t,
  view,
}: {
  isMutating: boolean;
  onEdit: () => void;
  onReset: () => void;
  showUsage: boolean;
  t: Translator;
  view: OverageLimitView;
}) {
  const noUsage = showUsage && !view.hasUsage;
  if (!view.editable && !noUsage) {
    return null;
  }
  return (
    <div className="schematic-overage-limit__actions">
      {view.editable && (
        <button
          className={cx(
            "schematic-cta",
            "schematic-cta--small",
            !(view.tone === "blocked" && view.canRaise) &&
              "schematic-cta--ghost",
            "schematic-overage-limit__edit",
          )}
          disabled={isMutating}
          type="button"
          onClick={onEdit}
        >
          {t("overageLimitChange")}
        </button>
      )}
      {view.canReset ? (
        <button
          className="schematic-link-button schematic-overage-limit__reset"
          disabled={isMutating}
          type="button"
          onClick={onReset}
        >
          {t("overageLimitReset")}
        </button>
      ) : (
        noUsage && (
          <span className="schematic-muted schematic-small schematic-overage-limit__no-usage">
            {t("overageLimitNoUsage")}
          </span>
        )
      )}
    </div>
  );
}

function OverageLimitForm({
  error,
  isMutating,
  locale,
  onCancel,
  onReset,
  onSave,
  overdraft,
  t,
  view,
}: {
  error: string | undefined;
  isMutating: boolean;
  locale: string;
  onCancel: () => void;
  onReset: () => void;
  onSave: (limit: number) => void;
  overdraft: CreditOverdraft;
  t: Translator;
  view: OverageLimitView;
}) {
  const [text, setText] = useState(() =>
    overageLimitInputText(overdraft, locale),
  );
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const input = validateOverageLimit(text, overdraft, locale);
  const inputError =
    touched && input.error !== undefined
      ? t(INPUT_ERROR_KEY[input.error], { units: view.units, ...view.max })
      : undefined;
  const money =
    input.value === undefined
      ? null
      : overageMoney(input.value, overdraft, locale);
  const hint = [
    money === null ? undefined : t("overageLimitFieldMoney", { amount: money }),
    view.max === null
      ? undefined
      : t(
          view.maxFromProvider
            ? "overageLimitFieldMaxProvider"
            : "overageLimitFieldMax",
          view.max,
        ),
  ]
    .filter((part) => part !== undefined)
    .join(" ");
  const message = inputError ?? error;

  return (
    <form
      className="schematic-overage-limit__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (input.value !== undefined) {
          onSave(input.value);
        }
      }}
    >
      <div className="schematic-field">
        <label className="schematic-overage-limit__label" htmlFor={inputId}>
          {t("overageLimitField")}
        </label>
        <div className="schematic-overage-limit__input">
          <input
            aria-describedby={
              cx(hint !== "" && hintId, message !== undefined && errorId) ||
              undefined
            }
            aria-invalid={inputError !== undefined}
            autoComplete="off"
            className="schematic-input"
            id={inputId}
            inputMode="decimal"
            ref={inputRef}
            type="text"
            value={text}
            onBlur={() => setTouched(true)}
            onChange={(event) => setText(event.target.value)}
          />
          <span
            aria-hidden="true"
            className="schematic-muted schematic-small schematic-overage-limit__unit"
          >
            {view.units}
          </span>
        </div>
        {hint !== "" && (
          <p
            className="schematic-muted schematic-small schematic-overage-limit__hint"
            id={hintId}
          >
            {hint}
          </p>
        )}
        {message !== undefined && (
          <p
            className="schematic-error schematic-small schematic-overage-limit__form-error"
            id={errorId}
            role="alert"
          >
            {message}
          </p>
        )}
      </div>
      <div className="schematic-overage-limit__actions">
        <div className="schematic-overage-limit__buttons">
          <button
            className="schematic-cta schematic-cta--small schematic-overage-limit__save"
            disabled={isMutating}
            type="submit"
          >
            {t("overageLimitSave")}
          </button>
          <button
            className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-overage-limit__cancel"
            disabled={isMutating}
            type="button"
            onClick={onCancel}
          >
            {t("overageLimitCancel")}
          </button>
        </div>
        {view.canReset && (
          <button
            className="schematic-link-button schematic-overage-limit__reset"
            disabled={isMutating}
            type="button"
            onClick={onReset}
          >
            {t("overageLimitUsePlanDefault")}
          </button>
        )}
      </div>
    </form>
  );
}

function OverageLimitSkeleton() {
  return (
    <div className="schematic-skeleton">
      <div className="schematic-skeleton__heading" />
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="credit" />
        <div className="schematic-skeleton__cell" data-column="rate" />
      </div>
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="limit" />
      </div>
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="action" />
      </div>
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
OverageLimit.resources = ["creditBalances"] as const;

export default OverageLimit;
