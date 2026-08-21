import {
  derivePlanSummary,
  useCatalog,
  useCompany,
  useSchematicLocale,
  type PlanSummaryNotice,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { PERIOD_WORDS, StatusFrame, cx } from "./common";

export interface PlanManagerProps {
  className?: string;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
  /** Called when the change-plan button is clicked; omits the button when absent. */
  onChangePlan?: () => void;
}

const Notice: React.FC<{ notice: PlanSummaryNotice }> = ({ notice }) => {
  let copy = "";
  switch (notice.kind) {
    case "trialing":
      copy = `Trial${notice.formattedTrialEndsAt !== undefined ? ` ends ${notice.formattedTrialEndsAt}` : ""}${notice.postTrialPlan !== undefined ? `, then ${notice.postTrialPlan.name}` : ""}`;
      break;
    case "will_cancel":
      copy = `Subscription ends ${notice.formattedCancelsAt}`;
      break;
    case "custom_plan_pending":
      copy = "Custom plan invoice pending";
      break;
    case "scheduled_downgrade":
      copy = `Changes to ${notice.toPlanName} on ${notice.formattedEffectiveAt}`;
      break;
  }
  if (
    notice.kind === "custom_plan_pending" &&
    notice.invoiceUrl !== undefined
  ) {
    return (
      <div className="schematic-notice">
        {copy}{" "}
        <a href={notice.invoiceUrl} rel="noreferrer" target="_blank">
          View invoice
        </a>
      </div>
    );
  }
  return <div className="schematic-notice">{copy}</div>;
};

/**
 * The company's current plan and add-ons with the highest-precedence
 * subscription notice (trialing, cancellation, pending custom-plan
 * invoice, scheduled downgrade). Reads the catalog view too, for the
 * post-trial plan. Requires an access token.
 */
export const PlanManager: React.FC<PlanManagerProps> = ({
  className,
  locale: localeProp,
  onChangePlan,
}) => {
  const { data, error, isPending, refetch } = useCompany();
  const catalog = useCatalog();
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;
  const vm = useMemo(
    () =>
      data !== undefined
        ? derivePlanSummary(
            {
              company: data,
              ...(catalog.data?.mode === "company"
                ? { catalog: catalog.data }
                : {}),
            },
            { locale },
          )
        : undefined,
    [catalog.data, data, locale],
  );

  return (
    <StatusFrame
      className={cx("schematic-plan-manager", className)}
      error={error}
      hasData={vm !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {vm !== undefined && (
        <>
          {vm.currentPlan !== undefined ? (
            <div className="schematic-row">
              <div>
                <h3>{vm.currentPlan.name}</h3>
                {vm.currentPlan.description !== undefined && (
                  <p className="schematic-muted">
                    {vm.currentPlan.description}
                  </p>
                )}
              </div>
              {vm.currentPlan.formattedPrice !== undefined && (
                <div className="schematic-plan-card__price">
                  {vm.currentPlan.formattedPrice}
                  {vm.currentPlan.period !== undefined && (
                    <span className="schematic-muted">
                      /
                      {PERIOD_WORDS[vm.currentPlan.period] ??
                        vm.currentPlan.period}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="schematic-muted">No active plan</p>
          )}
          {vm.addOns.map((addOn) => (
            <div className="schematic-row" key={addOn.id}>
              <span>{addOn.name}</span>
              {addOn.formattedPrice !== undefined && (
                <span>
                  {addOn.formattedPrice}
                  {addOn.period !== undefined && (
                    <span className="schematic-muted">
                      /{PERIOD_WORDS[addOn.period] ?? addOn.period}
                    </span>
                  )}
                </span>
              )}
            </div>
          ))}
          {vm.notice !== undefined && <Notice notice={vm.notice} />}
          {onChangePlan !== undefined && (
            <button
              className="schematic-cta"
              type="button"
              onClick={onChangePlan}
            >
              Change plan
            </button>
          )}
        </>
      )}
    </StatusFrame>
  );
};
