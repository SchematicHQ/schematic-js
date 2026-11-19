import {
  useCreditBalances,
  useSchematic,
  useSchematicCreditSpendPolicies,
} from "@schematichq/schematic-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  Tooltip,
  cx,
  isDevelopment,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
} from "./common";
import {
  creditUnits,
  deriveBalanceBadge,
  formatDate,
  formatDateTime,
  formatNumber,
  formatResetExact,
  isWithinDay,
  pickBadgeCredit,
  resetDistance,
  type BalanceBadgeCap,
  type BalanceBadgePeriod,
  type BalanceBadgeTone,
  type BalanceBadgeView,
} from "./model";
import type { StringKey, Translator } from "./strings";

export interface BalanceBadgeProps extends ElementProps {
  /** The credit to show; the company's only credit when absent. */
  creditId?: string;
  /** Where the badge links. Ignored when `onClick` is set. */
  href?: string;
  /** `target` for `href`. */
  target?: string;
  onClick?: () => void;
  /** The meter. Default true. */
  showMeter?: boolean;
  /** When the balance or limit resets. Default true. */
  showReset?: boolean;
  /** Percent used that turns the badge amber. Default 80. */
  warnAt?: number;
}

const LIMIT_REACHED: Record<BalanceBadgePeriod, StringKey> = {
  hourly: "balanceBadgeLimitReachedHourly",
  daily: "balanceBadgeLimitReachedDaily",
  weekly: "balanceBadgeLimitReachedWeekly",
  monthly: "balanceBadgeLimitReachedMonthly",
};

const PERIOD: Record<BalanceBadgePeriod, StringKey> = {
  hourly: "balanceBadgePeriodHourly",
  daily: "balanceBadgePeriodDaily",
  weekly: "balanceBadgePeriodWeekly",
  monthly: "balanceBadgePeriodMonthly",
};

const METER_TONE: Record<BalanceBadgeTone, string | undefined> = {
  ok: undefined,
  warning: "schematic-meter--warning",
  blocked: "schematic-meter--over",
};

/**
 * One credit's balance as a pill for the app shell: what is left, a meter,
 * and when it resets, turning amber near a limit and red at one. A spend
 * limit that binds the viewer counts when it is tighter than the balance.
 *
 * Needs `SchematicProvider`: the live balance and the viewer's limits come
 * over the DataStream once the host identifies, and the billing balance
 * stands in until then. Renders nothing without a credit, or on an error.
 */
export function BalanceBadge({
  className,
  creditId,
  href,
  locale: localeProp,
  onClick,
  showMeter = true,
  showReset = true,
  strings,
  target,
  warnAt,
}: BalanceBadgeProps) {
  const { data: balances, error, isPending } = useCreditBalances();
  const { policies } = useSchematicCreditSpendPolicies();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const picked =
    balances === undefined ? undefined : pickBadgeCredit(balances, creditId);
  const liveRemaining = useLiveRemaining(picked?.creditId);

  const view = useMemo(
    () =>
      balances === undefined
        ? undefined
        : deriveBalanceBadge(balances, {
            creditId,
            liveRemaining,
            locale,
            policies,
            warnAt,
          }),
    [balances, creditId, liveRemaining, locale, policies, warnAt],
  );

  const now = useNow(view?.resetsAt ?? null);

  useDevWarnings(balances, creditId, error);

  if (balances === undefined) {
    if (!isPending || error !== undefined) {
      return null;
    }
    return (
      <span
        aria-busy="true"
        className={cx("schematic-balance-badge", className)}
        data-state="pending"
      >
        <span className="schematic-hidden">{t("balanceBadgeLoading")}</span>
        <span
          aria-hidden="true"
          className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-balance-badge__pill"
        >
          <span className="schematic-skeleton">
            <span className="schematic-skeleton__cell" data-column="badge" />
          </span>
        </span>
      </span>
    );
  }
  if (view === null || view === undefined) {
    return null;
  }

  const reset = showReset ? resetText(view, now, locale, t) : null;
  const content = (
    <>
      <span
        className={cx(
          "schematic-balance-badge__amount",
          view.tone === "blocked" && "schematic-error",
        )}
      >
        {primaryText(view, locale, t)}
      </span>
      {showMeter && (
        <span
          aria-label={view.name}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={view.percent}
          className={cx(
            "schematic-meter",
            "schematic-balance-badge__meter",
            METER_TONE[view.tone],
          )}
          role="meter"
        >
          <span
            className="schematic-meter__fill"
            style={{ width: `${view.percent}%` }}
          />
        </span>
      )}
      {reset !== null && (
        <span className="schematic-muted schematic-small schematic-balance-badge__reset">
          {reset}
        </span>
      )}
    </>
  );

  const pill = (describedBy: string) => {
    const props = {
      "aria-describedby": describedBy,
      "className":
        "schematic-cta schematic-cta--small schematic-cta--ghost schematic-balance-badge__pill",
    };
    return onClick !== undefined ? (
      <button {...props} type="button" onClick={onClick}>
        {content}
      </button>
    ) : href !== undefined ? (
      <a {...props} href={href} target={target}>
        {content}
      </a>
    ) : (
      <span {...props} tabIndex={0}>
        {content}
      </span>
    );
  };

  return (
    <span
      className={cx("schematic-balance-badge", className)}
      data-state="ready"
      data-tone={view.tone}
    >
      <Tooltip placement="bottom" trigger={pill}>
        {tooltipLines(view, now, locale, t).map((line, index) => (
          <Fragment key={line}>
            {index > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </Tooltip>
    </span>
  );
}

function primaryText(
  view: BalanceBadgeView,
  locale: string,
  t: Translator,
): string {
  if (view.tone === "blocked") {
    return view.constraint.kind === "cap"
      ? t(LIMIT_REACHED[view.constraint.cap.period])
      : t("balanceBadgeOutOf", {
          units: creditUnits(view.source, 0, locale),
        });
  }
  return t("balanceBadgeAmount", view.remaining);
}

function resetText(
  view: BalanceBadgeView,
  now: Date,
  locale: string,
  t: Translator,
): string | null {
  const at = view.resetsAt;
  if (at === null) {
    return null;
  }
  const date = formatDate(at, locale, { month: "short", year: undefined });
  if (view.tone === "blocked") {
    return isWithinDay(at, now)
      ? t("balanceBadgeUnlocksAt", {
          time: formatDateTime(at, locale, { timeOnly: true }),
        })
      : t("balanceBadgeUnlocksOn", { date });
  }
  const distance = resetDistance(at, now);
  return distance === null
    ? t("balanceBadgeResetsOn", { date })
    : t("balanceBadgeResetsIn", {
        duration: formatNumber(distance.value, locale, {
          style: "unit",
          unit: distance.unit,
          unitDisplay: "narrow",
        }),
      });
}

function tooltipLines(
  view: BalanceBadgeView,
  now: Date,
  locale: string,
  t: Translator,
): string[] {
  const lines = [
    withReset(
      t("balanceBadgeLeft", {
        remaining: view.remaining.amount,
        total: view.total,
        units: creditUnits(view.source, view.source.total, locale),
      }),
      view.balanceResetsAt,
      now,
      locale,
      t,
    ),
  ];
  for (const cap of view.caps) {
    lines.push(withReset(capText(cap, t), cap.resetsAt, now, locale, t));
  }
  if (view.perUse !== null) {
    lines.push(
      t("balanceBadgePerUse", {
        limit: view.perUse.amount,
        units: view.perUse.units,
      }),
    );
  }
  return lines;
}

function capText(cap: BalanceBadgeCap, t: Translator): string {
  return t(
    cap.scope === "user" ? "balanceBadgeLimitUser" : "balanceBadgeLimitCompany",
    {
      consumed: cap.consumed,
      limit: cap.limit,
      period: t(PERIOD[cap.period]),
    },
  );
}

function withReset(
  text: string,
  at: Date | null,
  now: Date,
  locale: string,
  t: Translator,
): string {
  return at === null
    ? text
    : `${text} ${t("balanceBadgeResetsExact", {
        dateTime: formatResetExact(at, now, locale),
      })}`;
}

/**
 * The DataStream's spendable balance for a credit, or `undefined` while it
 * has none: `useSchematicCreditBalance` reports 0 for both.
 */
function useLiveRemaining(creditId: string | undefined): number | undefined {
  const { client } = useSchematic();
  const subscribe = useCallback(
    (callback: () => void) => client.addCreditBalanceListener(callback),
    [client],
  );
  const snapshot = useCallback(
    () =>
      creditId === undefined
        ? undefined
        : client.getCreditBalance(creditId)?.settled,
    [client, creditId],
  );
  return useSyncExternalStore(subscribe, snapshot, noLiveBalance);
}

const noLiveBalance = (): undefined => undefined;

/** A relative reset ("in 6h") goes stale on a pill that stays mounted. */
function useNow(resetsAt: Date | null): Date {
  const [now, setNow] = useState(() => new Date());
  const resetTime = resetsAt?.getTime();
  useEffect(() => {
    if (resetTime === undefined || resetTime - Date.now() >= DAY) {
      return;
    }
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [resetTime]);
  return now;
}

const DAY = 24 * 60 * 60 * 1000;

function useDevWarnings(
  balances: ReturnType<typeof useCreditBalances>["data"],
  creditId: string | undefined,
  error: Error | undefined,
): void {
  const ambiguous =
    balances !== undefined &&
    creditId === undefined &&
    balances.filter((b) => b.grants.length > 0 || b.total > 0).length > 1;
  const missing =
    balances !== undefined &&
    creditId !== undefined &&
    !balances.some((b) => b.creditId === creditId);
  useEffect(() => {
    if (!isDevelopment) {
      return;
    }
    if (ambiguous) {
      console.warn(
        "Schematic: BalanceBadge renders nothing: the company holds several credits; pass `creditId`.",
      );
    }
    if (missing) {
      console.warn(
        `Schematic: BalanceBadge renders nothing: the company has no credit "${creditId}".`,
      );
    }
  }, [ambiguous, creditId, missing]);
  useEffect(() => {
    if (isDevelopment && error !== undefined && balances === undefined) {
      console.error("Schematic: BalanceBadge could not read credits.", error);
    }
  }, [balances, error]);
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
BalanceBadge.resources = ["creditBalances"] as const;

export default BalanceBadge;
