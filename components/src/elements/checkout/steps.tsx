import type { CheckoutProblem } from "@schematichq/schematic-react";
import React, { useId, useState } from "react";

import { cx } from "../common";
import type {
  AutoTopupRow,
  BundleRow,
  CartAction,
  CheckoutModel,
  CheckoutPeriod,
  CheckoutStep,
  PlanRow,
  QuantityRow,
  StepPlan,
} from "../model";
import type { StringKey, Translator } from "../strings";

import {
  Price,
  ProblemList,
  periodName,
  stepLabel,
  type ProblemFormatter,
} from "./parts";

type Dispatch = (action: CartAction) => void;

/** A card's action: filled when its choice is on, outlined when it is off. */
const ctaClass = (on: boolean) =>
  cx("schematic-cta schematic-cta--small", !on && "schematic-cta--outline");

/**
 * The visible steps in order. A step behind the current one can be chosen,
 * and so can a skipped one, which then stays shown.
 */
export function Stepper({
  current,
  onSelect,
  plan,
  t,
}: {
  current: CheckoutStep;
  onSelect: (step: CheckoutStep) => void;
  plan: StepPlan;
  t: Translator;
}) {
  const currentIndex = plan.available.indexOf(current);
  return (
    <nav aria-label={t("checkoutStepsLabel")}>
      <ol className="schematic-checkout__stepper">
        {plan.visible.map((step) => {
          const index = plan.available.indexOf(step);
          const state =
            step === current
              ? "current"
              : index < currentIndex
                ? "done"
                : "upcoming";
          const skipped = plan.skipped.has(step);
          return (
            <li className="schematic-checkout__step" key={step}>
              <button
                aria-current={step === current ? "step" : undefined}
                className="schematic-checkout__step-link"
                data-skipped={skipped ? "true" : undefined}
                data-state={state}
                disabled={
                  state === "current" || (state === "upcoming" && !skipped)
                }
                type="button"
                onClick={() => onSelect(step)}
              >
                {stepLabel(step, t)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PeriodToggle({
  dispatch,
  model,
  t,
}: {
  dispatch: Dispatch;
  model: CheckoutModel;
  t: Translator;
}) {
  if (!model.period.selectable) {
    return null;
  }
  const { savings } = model.period;
  return (
    <>
      <div
        aria-label={t("checkoutPeriodLabel")}
        className="schematic-toggle"
        role="group"
      >
        {model.period.options.map((period: CheckoutPeriod) => (
          <button
            aria-pressed={period === model.period.value}
            className="schematic-toggle__option"
            key={period}
            type="button"
            onClick={() => dispatch({ type: "period", period })}
          >
            {periodName(period, t)}
          </button>
        ))}
      </div>
      {savings !== null && (
        <span className="schematic-checkout__savings">
          {t(SAVINGS[savings.period], { percent: savings.percentText })}
        </span>
      )}
    </>
  );
}

const SAVINGS: Record<"quarter" | "year", StringKey> = {
  quarter: "checkoutSavingsQuarter",
  year: "checkoutSavingsYear",
};

/**
 * The currency choice, on the plan step, or on the first step shown when the
 * plan step is passed over and nothing fixes the currency yet.
 */
export function CurrencySelect({
  dispatch,
  model,
  t,
}: {
  dispatch: Dispatch;
  model: CheckoutModel;
  t: Translator;
}) {
  const id = useId();
  if (!model.currency.selectable) {
    return null;
  }
  return (
    <span className="schematic-checkout__field">
      <label className="schematic-hidden" htmlFor={id}>
        {t("checkoutCurrencyLabel")}
      </label>
      <select
        className="schematic-select"
        id={id}
        value={model.currency.value}
        onChange={(event) =>
          dispatch({ type: "currency", currency: event.target.value })
        }
      >
        {model.currency.options.map((currency) => (
          <option key={currency} value={currency}>
            {currency.toUpperCase()}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * A plan or add-on, with its price for the period and what choosing it does.
 * One the company may not move to says why, and, when a downgrade rule is
 * the reason and the catalog names somewhere to ask, links there.
 */
function Card({
  action,
  contact = null,
  period,
  row,
  t,
}: {
  action: React.ReactNode;
  contact?: CheckoutModel["downgradeContact"];
  period: CheckoutPeriod;
  row: PlanRow;
  t: Translator;
}) {
  const blockedDowngrade = row.invalidReason === "downgrade_not_permitted";
  return (
    <li
      className="schematic-checkout__card"
      data-selected={row.selected ? "true" : "false"}
      data-testid="schematic-checkout-card"
      data-valid={row.valid ? "true" : "false"}
    >
      <h3 className="schematic-checkout__card-name">{row.name}</h3>
      <div className="schematic-checkout__card-badges">
        {row.current && (
          <span className="schematic-badge">{t("checkoutCurrentPlan")}</span>
        )}
        {row.trialDays !== null && (
          <span className="schematic-chip">
            {t("checkoutTrialDays", { count: row.trialDays })}
          </span>
        )}
      </div>
      {row.free ? (
        <span className="schematic-checkout__card-price">
          {t("checkoutFree")}
        </span>
      ) : row.priceText === null ? (
        <span className="schematic-muted schematic-small">
          {t("checkoutPlanNotPriced")}
        </span>
      ) : (
        <Price
          period={period}
          recurring={row.recurring}
          t={t}
          text={row.priceText}
        />
      )}
      {row.description !== "" && (
        <p className="schematic-checkout__card-description">
          {row.description}
        </p>
      )}
      {!row.valid && (
        <p className="schematic-error schematic-small">
          {blockedDowngrade
            ? t("checkoutPlanDowngradeBlocked")
            : row.violations.length > 0
              ? t("checkoutPlanOverLimitFeatures", {
                  features: row.violations.join(", "),
                })
              : t("checkoutPlanOverLimit")}
        </p>
      )}
      {blockedDowngrade && contact !== null && (
        <a
          className="schematic-link-button schematic-checkout__card-link"
          href={contact.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {contact.text ?? t("checkoutTalkToSupport")}
        </a>
      )}
      {action}
    </li>
  );
}

/**
 * The catalog's custom plan: a card with no price to choose, only a way to
 * ask for one.
 */
function CustomPlanCard({
  custom,
  t,
}: {
  custom: NonNullable<CheckoutModel["customPlan"]>;
  t: Translator;
}) {
  return (
    <li
      className="schematic-checkout__card schematic-checkout__card--custom"
      data-selected="false"
      data-testid="schematic-checkout-card"
      data-valid="true"
    >
      <h3 className="schematic-checkout__card-name">
        {t("checkoutCustomPlan")}
      </h3>
      <span className="schematic-checkout__card-price">
        {custom.priceText ?? t("checkoutCustomPlanPrice")}
      </span>
      {custom.ctaUrl !== null && (
        <a
          className="schematic-cta schematic-cta--small schematic-cta--outline"
          href={custom.ctaUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {custom.ctaText ?? t("checkoutTalkToSupport")}
        </a>
      )}
    </li>
  );
}

export function PlanStep({
  dispatch,
  format,
  model,
  problems,
  t,
  trialOffered,
  trialChosen,
}: {
  dispatch: Dispatch;
  format?: ProblemFormatter;
  model: CheckoutModel;
  problems: readonly CheckoutProblem[] | undefined;
  t: Translator;
  /** The chosen plan offers the company a trial. */
  trialOffered: boolean;
  trialChosen: boolean;
}) {
  return (
    <section className="schematic-checkout__section" data-step="plan">
      <div className="schematic-checkout__controls">
        <PeriodToggle dispatch={dispatch} model={model} t={t} />
        <CurrencySelect dispatch={dispatch} model={model} t={t} />
      </div>
      <ul className="schematic-checkout__cards">
        {model.plans.map((row) => (
          <Card
            action={
              <button
                aria-pressed={row.selected}
                className={ctaClass(row.selected)}
                disabled={!row.valid || (row.priceText === null && !row.free)}
                type="button"
                onClick={() => dispatch({ type: "plan", planId: row.id })}
              >
                {row.selected ? t("checkoutSelected") : t("checkoutSelect")}
              </button>
            }
            contact={model.downgradeContact}
            key={row.id}
            period={model.period.value}
            row={row}
            t={t}
          />
        ))}
        {model.customPlan !== null && (
          <CustomPlanCard custom={model.customPlan} t={t} />
        )}
      </ul>
      {trialOffered && (
        <label className="schematic-checkout__check">
          <input
            checked={trialChosen}
            type="checkbox"
            onChange={(event) =>
              dispatch({ type: "trial", trial: event.target.checked })
            }
          />
          <span>{t("checkoutTrialToggle")}</span>
        </label>
      )}
      <ProblemList format={format} problems={problems} />
    </section>
  );
}

export function AddOnsStep({
  dispatch,
  format,
  model,
  problems,
  t,
}: {
  dispatch: Dispatch;
  format?: ProblemFormatter;
  model: CheckoutModel;
  problems: readonly CheckoutProblem[] | undefined;
  t: Translator;
}) {
  return (
    <section className="schematic-checkout__section" data-step="addOns">
      {model.addOns.length === 0 ? (
        <p className="schematic-muted">{t("checkoutAddOnsEmpty")}</p>
      ) : (
        <ul className="schematic-checkout__cards">
          {model.addOns.map((row) => (
            <Card
              action={
                <button
                  aria-pressed={row.selected}
                  className={ctaClass(row.selected)}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "addOn",
                      addOnId: row.id,
                      selected: !row.selected,
                    })
                  }
                >
                  {row.selected ? t("checkoutRemove") : t("checkoutAdd")}
                </button>
              }
              key={row.id}
              period={model.period.value}
              row={row}
              t={t}
            />
          ))}
        </ul>
      )}
      <ProblemList format={format} problems={problems} />
    </section>
  );
}

/**
 * A number field that holds what is typed while it is being edited, so
 * clearing it to type a new count does not snap back to zero mid-edit. What
 * it reports is whole and at least `min`; an empty field reports nothing.
 */
function QuantityInput({
  id,
  label,
  min = 0,
  onChange,
  value,
}: {
  id?: string;
  label?: string;
  min?: number;
  onChange: (quantity: number) => void;
  value: number | null;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      className="schematic-checkout__input schematic-checkout__input--quantity"
      id={id}
      inputMode="numeric"
      min={min}
      step={1}
      type="number"
      value={draft ?? (value === null ? "" : String(value))}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (event.target.value !== "" && Number.isFinite(parsed)) {
          onChange(Math.max(min, Math.floor(parsed)));
        }
      }}
    />
  );
}

export function QuantityStep({
  dispatch,
  format,
  problems,
  rows,
  step,
  t,
}: {
  dispatch: Dispatch;
  format?: ProblemFormatter;
  problems: readonly CheckoutProblem[] | undefined;
  rows: QuantityRow[];
  step: "usage" | "addOnUsage";
  t: Translator;
}) {
  return (
    <section className="schematic-checkout__section" data-step={step}>
      <ul className="schematic-checkout__rows">
        {rows.map((row) => (
          <li
            className="schematic-checkout__row"
            data-testid="schematic-checkout-quantity"
            key={row.featureId}
          >
            <span className="schematic-checkout__row-name">
              {row.name}
              {row.unitPriceText !== null && (
                <span className="schematic-checkout__row-detail">
                  {" "}
                  {t("checkoutPerUnit", { price: row.unitPriceText })}
                </span>
              )}
              {row.currentQuantity !== null && (
                <span className="schematic-checkout__row-detail">
                  {" · "}
                  {t("checkoutCurrentQuantity", { count: row.currentQuantity })}
                </span>
              )}
            </span>
            <QuantityInput
              label={t("checkoutQuantityLabel", { name: row.name })}
              value={row.quantity}
              onChange={(quantity) =>
                dispatch({
                  type: "quantity",
                  featureId: row.featureId,
                  quantity,
                })
              }
            />
            <span className="schematic-checkout__row-amount">
              {row.totalText}
            </span>
          </li>
        ))}
      </ul>
      <ProblemList format={format} problems={problems} />
    </section>
  );
}

export function CreditsStep({
  dispatch,
  format,
  mode,
  problems,
  rows,
  t,
}: {
  dispatch: Dispatch;
  format?: ProblemFormatter;
  mode: CheckoutModel["bundleMode"];
  problems: readonly CheckoutProblem[] | undefined;
  rows: BundleRow[];
  t: Translator;
}) {
  return (
    <section className="schematic-checkout__section" data-step="credits">
      <ul className="schematic-checkout__rows">
        {rows.map((row) => (
          <li
            className="schematic-checkout__row"
            data-testid="schematic-checkout-bundle"
            key={row.id}
          >
            <span className="schematic-checkout__row-name">
              {row.name}
              <span className="schematic-checkout__row-detail">
                {" "}
                {row.credits === null
                  ? t("checkoutPerUnit", { price: row.priceText ?? "" })
                  : `${t("checkoutCreditsCount", {
                      count: row.credits,
                      credits: row.creditName,
                    })} · ${row.priceText ?? ""}`}
              </span>
            </span>
            {mode === "individual" ? (
              <button
                aria-pressed={row.quantity > 0}
                className={ctaClass(row.quantity > 0)}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "bundle",
                    bundleId: row.id,
                    quantity: row.quantity > 0 ? 0 : 1,
                  })
                }
              >
                {row.quantity > 0 ? t("checkoutRemove") : t("checkoutAdd")}
              </button>
            ) : (
              <QuantityInput
                label={t("checkoutQuantityLabel", { name: row.name })}
                value={row.quantity}
                onChange={(quantity) =>
                  dispatch({ type: "bundle", bundleId: row.id, quantity })
                }
              />
            )}
          </li>
        ))}
      </ul>
      <ProblemList format={format} problems={problems} />
    </section>
  );
}

export function AutoTopupStep({
  dispatch,
  rows,
  t,
}: {
  dispatch: Dispatch;
  rows: AutoTopupRow[];
  t: Translator;
}) {
  return (
    <section className="schematic-checkout__section" data-step="autoTopup">
      <ul className="schematic-checkout__rows">
        {rows.map((row) => (
          <AutoTopupItem
            dispatch={dispatch}
            key={row.grantId}
            row={row}
            t={t}
          />
        ))}
      </ul>
    </section>
  );
}

function AutoTopupItem({
  dispatch,
  row,
  t,
}: {
  dispatch: Dispatch;
  row: AutoTopupRow;
  t: Translator;
}) {
  const thresholdId = useId();
  const amountId = useId();
  return (
    <li
      className="schematic-checkout__row"
      data-testid="schematic-checkout-topup"
    >
      <label className="schematic-checkout__check">
        <input
          checked={row.enabled}
          type="checkbox"
          onChange={(event) =>
            dispatch({
              type: "autoTopup",
              grantId: row.grantId,
              choice: { enabled: event.target.checked },
            })
          }
        />
        <span className="schematic-checkout__row-name">
          {t("checkoutAutoTopupEnable", { credits: row.creditName })}
        </span>
      </label>
      {row.enabled && (
        <div className="schematic-checkout__inline">
          <span className="schematic-checkout__field">
            <label
              className="schematic-checkout__field-label"
              htmlFor={thresholdId}
            >
              {t("checkoutAutoTopupThreshold")}
            </label>
            <QuantityInput
              id={thresholdId}
              value={row.thresholdCredits}
              onChange={(thresholdCredits) =>
                dispatch({
                  type: "autoTopup",
                  grantId: row.grantId,
                  choice: { thresholdCredits },
                })
              }
            />
          </span>
          <span className="schematic-checkout__field">
            <label
              className="schematic-checkout__field-label"
              htmlFor={amountId}
            >
              {t("checkoutAutoTopupAmount")}
            </label>
            <QuantityInput
              id={amountId}
              min={1}
              value={row.amount}
              onChange={(amount) =>
                dispatch({
                  type: "autoTopup",
                  grantId: row.grantId,
                  choice: { amount },
                })
              }
            />
          </span>
          {row.costText !== null && (
            <span className="schematic-checkout__row-detail">
              {t("checkoutAutoTopupCost", { cost: row.costText })}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
