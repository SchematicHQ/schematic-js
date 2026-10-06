import {
  useCompany,
  useFeatureUsage,
  useUnsubscribe,
} from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
} from "./common";
import { deriveUnsubscribe, httpStatus } from "./model";
import type { StringKey, Translator } from "./strings";
import { shortPeriod } from "./usage";

export interface UnsubscribeButtonProps extends ElementProps {
  /**
   * Called by "Manage plan" in the dialog, for a company that would rather
   * change plan than cancel. Without this or `managePlanUrl` the dialog has
   * no "Manage plan".
   */
  onManagePlan?: () => void;
  /** "Manage plan" links here when there is no `onManagePlan`. */
  managePlanUrl?: string;
  /** `target` for `managePlanUrl`. */
  managePlanTarget?: string;
  /** Called once the subscription is set to cancel. */
  onUnsubscribed?: () => void;
}

const TOTAL_KEY: Record<string, StringKey> = {
  quarter: "unsubscribeQuarterlyTotal",
  year: "unsubscribeYearlyTotal",
};

/**
 * A button that cancels the company's subscription at period end, after a
 * dialog that says when access ends and what the subscription costs.
 *
 * Renders nothing until the company and its usage load, or when there is no
 * subscription left to cancel, so it goes once a cancellation lands.
 */
export function UnsubscribeButton({
  className,
  locale: localeProp,
  managePlanTarget,
  managePlanUrl,
  onManagePlan,
  onUnsubscribed,
  strings,
}: UnsubscribeButtonProps) {
  const company = useCompany();
  const usage = useFeatureUsage();
  const { isMutating, unsubscribe } = useUnsubscribe();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const view = useMemo(
    () =>
      company.data === undefined || usage.data === undefined
        ? undefined
        : deriveUnsubscribe(company.data, usage.data, { locale }),
    [company.data, locale, usage.data],
  );

  if (view === undefined) {
    const error = company.error ?? usage.error;
    if (error === undefined) {
      return null;
    }
    return (
      <StatusFrame
        className={cx("schematic-card", "schematic-unsubscribe", className)}
        error={error}
        errorMessage={
          httpStatus(error) === 404
            ? t("unsubscribeUnavailable")
            : t("unsubscribeError")
        }
        hasData={false}
        isPending={false}
        loadingLabel=""
        onRetry={() => {
          for (const handle of [company, usage]) {
            if (handle.error !== undefined) {
              handle.refetch();
            }
          }
        }}
        retryText={t("retry")}
      >
        {null}
      </StatusFrame>
    );
  }

  if (!view.canUnsubscribe && !open) {
    return null;
  }

  const close = () => {
    setOpen(false);
    setFailed(false);
  };
  const confirm = async () => {
    setFailed(false);
    try {
      await unsubscribe();
    } catch {
      // The embed's message, not the server's: the reason is no use to the
      // company, and the hook keeps it for the host.
      setFailed(true);
      return;
    }
    setOpen(false);
    onUnsubscribed?.();
  };
  const per = shortPeriod(view.period, t);

  return (
    <div className={cx("schematic-card", "schematic-unsubscribe", className)}>
      <button
        className="schematic-cta schematic-unsubscribe__open"
        type="button"
        onClick={() => setOpen(true)}
      >
        {t("unsubscribeButton")}
      </button>
      <Dialog
        className="schematic-unsubscribe__dialog"
        closeLabel={t("unsubscribeClose")}
        open={open}
        title={t("unsubscribeTitle")}
        onClose={close}
      >
        <div className="schematic-unsubscribe__columns">
          <div className="schematic-unsubscribe__summary">
            <p>{t("unsubscribeAccessUntil", { date: view.accessEndsOn })}</p>
            <ManagePlan
              onClick={onManagePlan}
              t={t}
              target={managePlanTarget}
              url={managePlanUrl}
            />
          </div>
          <div className="schematic-unsubscribe__sidebar">
            {view.plan !== null && (
              <div className="schematic-unsubscribe__group">
                <span className="schematic-muted schematic-small">
                  {t("unsubscribePlan")}
                </span>
                <div className="schematic-unsubscribe__line">
                  <span className="schematic-unsubscribe__name">
                    {view.plan.name}
                  </span>
                  {view.plan.price !== null && (
                    <span>
                      {view.plan.price}
                      {per !== undefined && <sub>/{per}</sub>}
                    </span>
                  )}
                </div>
              </div>
            )}
            {view.addOns.length > 0 && (
              <div className="schematic-unsubscribe__group">
                <span className="schematic-muted schematic-small">
                  {t("unsubscribeAddOns")}
                </span>
                {view.addOns.map((addOn) => (
                  <div className="schematic-unsubscribe__line" key={addOn.id}>
                    <span className="schematic-unsubscribe__name">
                      {addOn.name}
                    </span>
                    <span>
                      {addOn.price}
                      {!addOn.oneTime && per !== undefined && <sub>/{per}</sub>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="schematic-unsubscribe__line schematic-unsubscribe__total">
              <span className="schematic-muted">
                {t(TOTAL_KEY[view.period] ?? "unsubscribeMonthlyTotal")}
              </span>
              <span>
                {view.total}
                {per !== undefined && <sub>/{per}</sub>}
              </span>
            </div>
            <button
              className="schematic-cta schematic-unsubscribe__confirm"
              disabled={isMutating}
              type="button"
              onClick={() => void confirm()}
            >
              {t("unsubscribeConfirm")}
            </button>
            {failed && (
              <p className="schematic-error" role="alert">
                {t("unsubscribeFailed")}
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/** "Not ready to cancel?" and the host's way back to the plans. */
function ManagePlan({
  onClick,
  t,
  target,
  url,
}: {
  onClick: (() => void) | undefined;
  t: Translator;
  target: string | undefined;
  url: string | undefined;
}) {
  if (onClick === undefined && url === undefined) {
    return null;
  }
  const label = t("unsubscribeManagePlan");
  return (
    <div className="schematic-unsubscribe__manage">
      <p>{t("unsubscribeNotReady")}</p>
      {onClick !== undefined ? (
        <button
          className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-unsubscribe__manage-plan"
          type="button"
          onClick={onClick}
        >
          {label}
        </button>
      ) : (
        <a
          className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-unsubscribe__manage-plan"
          href={url}
          target={target}
        >
          {label}
        </a>
      )}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
UnsubscribeButton.resources = ["company", "featureUsage"] as const;

export default UnsubscribeButton;
