import { useMemo } from "react";

import { useCatalog, useCompany } from "../data";
import {
  derivePlanSummary,
  resolveLocale,
  type AutoTopupLine,
  type Notice,
  type PlanSummary,
  type SummaryPrice,
} from "../model";

import { Cta, StatusFrame, cx, type ElementProps } from "./common";
import {
  entitlementText,
  noticeText,
  perUnitShort,
  planCreditExtraText,
  planCreditText,
} from "./copy";

export interface PlanManagerProps extends ElementProps {
  /** Plan name, description, and price. Default true. */
  showHeader?: boolean;
  /** Plan description under the name. Default true. */
  showDescription?: boolean;
  /** Price line beside the name. Default true. */
  showPrice?: boolean;
  /** Held add-ons. Default true. */
  showAddOns?: boolean;
  /** Priced entitlements of the current plan. Default true. */
  showUsageBased?: boolean;
  /** Credits included with the plan. Default true. */
  showCredits?: boolean;
  /** Auto top-up settings under the credits. Default true. */
  showAutoTopup?: boolean;
  /** Trial / cancel / custom-billing / downgrade notice. Default true. */
  showNotice?: boolean;
  /** "Renews on" line when no notice applies. Default true. */
  showRenewal?: boolean;
  /** Render a $0 plan as "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /** Plan-change call to action. Default true. */
  showCallToAction?: boolean;
  /** Call-to-action label. Default "Change plan". */
  callToActionText?: string;
  /** Called when the call to action is activated. */
  onChangePlan?: (summary: PlanSummary) => void;
  /** Call-to-action destination; combined with `onChangePlan` when both are given. */
  changePlanUrl?: string;
  changePlanTarget?: string;
  /** Called when an auto top-up "Edit" is activated. */
  onEditAutoTopup?: (line: AutoTopupLine) => void;
  /** "Edit" destination; combined with `onEditAutoTopup` when both are given. */
  editAutoTopupUrl?: string;
  /** "Now", for trial countdowns. Default: the wall clock. */
  now?: Date;
}

const NOTICE_VARIANT: Record<Notice["kind"], string | undefined> = {
  cancel: "schematic-notice--danger",
  custom_billing: "schematic-notice--warning",
  scheduled_downgrade: "schematic-notice--warning",
  trial: undefined,
};

/** "Adds 500 AI credits when 50 remaining in balance". */
function autoTopupText(line: AutoTopupLine): string {
  if (!line.enabled) {
    return `Auto top-up disabled for ${line.unit}`;
  }
  if (line.amountText === null || line.thresholdText === null) {
    return `Auto top-up enabled for ${line.unit}`;
  }
  return `Adds ${line.amountText} ${line.unit} when ${line.thresholdText} remaining in balance`;
}

/**
 * The company's current plan: name and price, the one notice that applies,
 * held add-ons, usage-based entitlements, included credits with their auto
 * top-up settings, and a call to action to change plan. Needs the company
 * resource; the catalog, when present, adds the trial landing plan, the
 * usage-based rows, and the credits.
 */
export function PlanManager({
  callToActionText = "Change plan",
  changePlanTarget,
  changePlanUrl,
  className,
  editAutoTopupUrl,
  locale: localeProp,
  now,
  onChangePlan,
  onEditAutoTopup,
  showAddOns = true,
  showAutoTopup = true,
  showCallToAction = true,
  showCredits = true,
  showDescription = true,
  showHeader = true,
  showNotice = true,
  showPrice = true,
  showRenewal = true,
  showUsageBased = true,
  showZeroPriceAsFree = false,
}: PlanManagerProps) {
  const { data: company, error, isPending, refetch } = useCompany();
  const { data: catalog } = useCatalog();
  const locale = resolveLocale(localeProp);

  const summary = useMemo(
    () =>
      company === undefined
        ? undefined
        : derivePlanSummary(
            { company, catalog },
            { locale, now, showCredits, showZeroPriceAsFree },
          ),
    [catalog, company, locale, now, showCredits, showZeroPriceAsFree],
  );

  const notice =
    showNotice && summary !== undefined && summary.notice !== null
      ? summary.notice
      : null;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-plan-manager", className)}
      error={error}
      hasData={summary !== undefined}
      isPending={isPending}
      label="plan"
      onRetry={refetch}
    >
      {summary !== undefined && (
        <>
          {summary.plan === null ? (
            <header
              className="schematic-plan-manager__header"
              data-testid="sch-plan-header"
            >
              <h2>No plan</h2>
            </header>
          ) : (
            showHeader && (
              <header
                className="schematic-plan-manager__header"
                data-testid="sch-plan-header"
              >
                <div>
                  <h2>{summary.plan.name}</h2>
                  {showDescription && summary.plan.description !== "" && (
                    <p className="schematic-muted">
                      {summary.plan.description}
                    </p>
                  )}
                </div>
                {showPrice && (
                  <div
                    className="schematic-plan-manager__price"
                    data-testid="sch-plan-price"
                  >
                    <PriceText price={summary.plan.price} />
                  </div>
                )}
              </header>
            )
          )}

          {notice !== null && <NoticeBlock notice={notice} />}

          {showRenewal && notice === null && summary.renewsAt !== null && (
            <p
              className="schematic-small schematic-muted"
              data-testid="sch-renewal"
            >
              Renews on {summary.renewsAt.text}
            </p>
          )}

          {showAddOns && summary.addOns.length > 0 && (
            <section
              className="schematic-plan-manager__section"
              data-testid="sch-add-ons"
            >
              <h3>Add-ons</h3>
              {summary.addOns.map((line) => (
                <div
                  key={line.id}
                  className="schematic-row"
                  data-testid="sch-add-on"
                >
                  <span>
                    {line.name}
                    {line.quantity !== null && (
                      <span className="schematic-muted">
                        {" "}
                        × {line.quantity}
                      </span>
                    )}
                  </span>
                  <span>
                    {line.priceText === null ? (
                      "Free"
                    ) : line.isOneTime ? (
                      <>
                        {line.priceText} <sub>one-time</sub>
                      </>
                    ) : (
                      <>
                        {line.priceText}
                        {line.periodShort !== null && (
                          <sub>/{line.periodShort}</sub>
                        )}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </section>
          )}

          {showUsageBased && summary.usageBased.length > 0 && (
            <section
              className="schematic-plan-manager__section"
              data-testid="sch-usage-based"
            >
              <h3>Usage-based</h3>
              {summary.usageBased.map((row) => (
                <div
                  key={row.feature.id}
                  className="schematic-row"
                  data-testid="sch-usage-based-row"
                >
                  <span>{row.feature.name}</span>
                  <span>
                    {entitlementText(row.value)}
                    {row.overage !== null && (
                      <span className="schematic-plan-manager__detail schematic-muted">
                        then {perUnitShort(row.overage)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </section>
          )}

          {showCredits && summary.credits.length > 0 && (
            <section
              className="schematic-plan-manager__section"
              data-testid="sch-credits"
            >
              <h3>Credits in plan</h3>
              {summary.credits.map((credit) => {
                const extra = planCreditExtraText(credit);
                return (
                  <div
                    key={credit.credit.id}
                    className="schematic-row"
                    data-testid="sch-credit"
                  >
                    <span>{credit.credit.name}</span>
                    <span>
                      {planCreditText(credit)}
                      {extra !== null && (
                        <span className="schematic-plan-manager__detail schematic-muted">
                          {extra}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
              {showAutoTopup && summary.autoTopups.length > 0 && (
                <div
                  className="schematic-plan-manager__auto-topup"
                  data-testid="sch-auto-topup"
                >
                  <p className="schematic-plan-manager__label">Auto top-up</p>
                  {summary.autoTopups.map((line) => (
                    <div key={line.credit.id} className="schematic-row">
                      <span>{autoTopupText(line)}</span>
                      {line.selfService && (
                        <EditAutoTopup
                          url={editAutoTopupUrl}
                          onClick={() => onEditAutoTopup?.(line)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {showCallToAction && summary.canChangePlan && (
            <div
              className="schematic-plan-manager__action"
              data-testid="sch-change-plan"
            >
              <Cta
                target={changePlanTarget}
                url={changePlanUrl}
                onClick={() => onChangePlan?.(summary)}
              >
                {callToActionText}
              </Cta>
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

function PriceText({ price }: { price: SummaryPrice }) {
  switch (price.kind) {
    case "usage_based":
      return <span>Usage-based</span>;
    case "free":
      return <span>Free</span>;
    case "custom":
      return <span>Custom</span>;
    case "priced":
      return (
        <>
          <span>{price.text}</span>
          {price.periodShort !== null && <sub>/{price.periodShort}</sub>}
        </>
      );
  }
}

function NoticeBlock({ notice }: { notice: Notice }) {
  const { body, title } = noticeText(notice);
  return (
    <div
      className={cx(
        "schematic-notice",
        "schematic-plan-manager__notice",
        NOTICE_VARIANT[notice.kind],
      )}
      data-testid="sch-plan-notice"
      role="status"
    >
      <h3>{title}</h3>
      {body !== null && <p>{body}</p>}
      {notice.kind === "custom_billing" && notice.invoiceUrl !== null && (
        <Cta
          className="schematic-cta--small"
          target="_blank"
          url={notice.invoiceUrl}
        >
          Pay now
        </Cta>
      )}
    </div>
  );
}

function EditAutoTopup({
  onClick,
  url,
}: {
  onClick: () => void;
  url?: string;
}) {
  if (url !== undefined) {
    return (
      <a className="schematic-link-button" href={url} onClick={onClick}>
        Edit
      </a>
    );
  }
  return (
    <button className="schematic-link-button" type="button" onClick={onClick}>
      Edit
    </button>
  );
}

export default PlanManager;
