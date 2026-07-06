import { useMemo } from "react";

import {
  DAYS_IN_MS,
  HOURS_IN_MS,
  MINUTES_IN_MS,
  SECONDS_IN_MS,
} from "../../../const";
import { pluralize, toPrettyDate } from "../../../utils";

/** Trial lifecycle, structurally matching `CheckPlanReturn["trialStatus"]`. */
export type TrialStatus = "active" | "converted" | "expired";

export interface UseTrialPillProps {
  /** Trial end date (e.g. `useSchematicPlan().trialEndDate`). */
  trialEndDate?: Date;
  /** Trial status (e.g. `useSchematicPlan().trialStatus`). */
  trialStatus?: TrialStatus;
  /**
   * Reference "now" used for the time-remaining math. Defaults to the current
   * time; inject a fixed value for deterministic SSR/tests.
   */
  now?: Date;
}

type PropGetter = () => React.HTMLAttributes<HTMLElement> &
  Record<string, unknown>;

export interface TrialPillApi {
  status?: TrialStatus;
  /** Whether there is trial information worth displaying (false once converted). */
  hasTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  /**
   * Whole-unit magnitude of time until (or since, when expired) the end date,
   * using a day → hour → minute → second ladder. Undefined without an end date.
   */
  amount?: number;
  /** Pluralized unit label matching `amount` (e.g. `"days"`). */
  units?: string;
  /** Human-formatted end date (e.g. `"July 7, 2026"`). Undefined without an end date. */
  endDateLabel?: string;
  getRootProps: PropGetter;
  getLabelProps: PropGetter;
  getTimeRemainingProps: PropGetter;
  getEndDateProps: PropGetter;
}

/**
 * Headless logic for a trial pill/badge. Pure and controlled — it fetches
 * nothing; the caller supplies `trialEndDate`/`trialStatus` (typically from
 * `useSchematicPlan`) and spreads the returned prop-getters onto their own
 * markup, or lets the `TrialPill.*` compound components do it.
 */
export function useTrialPill({
  trialEndDate,
  trialStatus,
  now,
}: UseTrialPillProps): TrialPillApi {
  return useMemo(() => {
    const reference = now ?? new Date();
    const status = trialStatus;

    let amount: number | undefined;
    let units: string | undefined;
    let remainingMs: number | undefined;

    if (trialEndDate) {
      remainingMs = trialEndDate.getTime() - reference.getTime();
      const magnitude = Math.abs(remainingMs);

      let unit: string;
      if (magnitude >= DAYS_IN_MS) {
        amount = Math.floor(magnitude / DAYS_IN_MS);
        unit = "day";
      } else if (magnitude >= HOURS_IN_MS) {
        amount = Math.floor(magnitude / HOURS_IN_MS);
        unit = "hour";
      } else if (magnitude >= MINUTES_IN_MS) {
        amount = Math.floor(magnitude / MINUTES_IN_MS);
        unit = "minute";
      } else {
        amount = Math.floor(magnitude / SECONDS_IN_MS);
        unit = "second";
      }

      units = pluralize(unit, amount);
    }

    const isExpired =
      status === "expired" || (remainingMs !== undefined && remainingMs <= 0);
    const isActive =
      status === "active" ||
      (status === undefined && remainingMs !== undefined && remainingMs > 0);
    const hasTrial =
      status !== "converted" &&
      (Boolean(trialEndDate) || status === "active" || status === "expired");
    const endDateLabel = trialEndDate ? toPrettyDate(trialEndDate) : undefined;

    return {
      status,
      hasTrial,
      isActive,
      isExpired,
      amount,
      units,
      endDateLabel,
      getRootProps: () => ({
        "data-schematic": "trial-pill",
        "data-part": "root",
        ...(status ? { "data-trial-status": status } : {}),
        ...(isExpired ? { "data-expired": "true" } : {}),
      }),
      getLabelProps: () => ({
        "data-schematic": "trial-pill-label",
        "data-part": "label",
      }),
      getTimeRemainingProps: () => ({
        "data-schematic": "trial-pill-time-remaining",
        "data-part": "time-remaining",
        "children":
          amount !== undefined && units ? `${amount} ${units}` : undefined,
      }),
      getEndDateProps: () => ({
        "data-schematic": "trial-pill-end-date",
        "data-part": "end-date",
        ...(trialEndDate ? { dateTime: trialEndDate.toISOString() } : {}),
        "children": endDateLabel,
      }),
    };
  }, [trialEndDate, trialStatus, now]);
}
