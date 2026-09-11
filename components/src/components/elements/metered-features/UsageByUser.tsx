import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  CreditUserUsageResponseData,
  FeatureUserUsageResponseData,
} from "../../../api/checkoutexternal";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import {
  ERROR_UNKNOWN,
  formatNumber,
  getFeatureName,
  isError,
} from "../../../utils";
import { ExpandListToggle } from "../../shared";
import { Box, Button, Flex, Text } from "../../ui";

// Collapsed state shows the top N users by usage; the rest (plus the
// unattributed row) reveal on expansion.
const COLLAPSED_COUNT = 3;

// Cap the expanded list too: a company can have thousands of users, and an
// inline list that long is unusable. The remainder is reported as a count, and
// the fetch asks for exactly this many so the two never disagree.
const EXPANDED_COUNT = 20;

export interface UsageByUserEntry {
  // Stable key for the row; undefined/null for the unattributed rollup.
  id?: string | null;
  // Display name (often an email).
  label: string;
  amount: number;
}

// UsageByUserSource is the resource whose per-user breakdown to load. Features
// and credits are separate endpoints — each is one ordered list of users — so
// the section fetches its own rather than sharing a composite response.
export type UsageByUserSource =
  { kind: "feature"; id: string } | { kind: "credit"; id: string };

// UsageByUserSection is one API section (a feature or a credit) reshaped for
// this component: the page of entries plus the period-wide figures the page
// itself can't convey.
interface UsageByUserSection {
  entries: UsageByUserEntry[];
  total: number;
  totalUsers: number;
  unattributed?: UsageByUserEntry | null;
}

// What one fetch produced, tagged with the source it was fetched for.
interface UsageByUserResult {
  sourceKey: string;
  section?: UsageByUserSection;
  error?: Error;
}

// The nameable whose noun denominates every amount in the section — the feature
// for a feature section, the credit for a credit section. Passed as the object
// rather than a rendered string so each amount can pluralize against its own
// value, the way the rest of the element labels usage.
interface UsageUnit {
  name: string;
  singularName?: string | null;
  pluralName?: string | null;
}

interface UsageByUserProps {
  source: UsageByUserSource;
  unit: UsageUnit;
}

// toCreditSection / toFeatureSection reshape the two endpoint payloads onto the
// one shape this component renders. The API already excludes the unattributed
// rollup from entries and from total_users, so neither needs deriving here.
const toCreditSection = (
  data: CreditUserUsageResponseData,
): UsageByUserSection => ({
  entries: data.entries.map((entry) => ({
    id: entry.userId,
    // An entry with no hydrated user record still has an id worth showing —
    // a blank row identifies nobody.
    label: entry.user?.name || entry.userId || "",
    amount: entry.creditsUsed,
  })),
  total: data.total,
  totalUsers: data.totalUsers,
  unattributed: data.unattributed
    ? { id: null, label: "", amount: data.unattributed.creditsUsed }
    : null,
});

const toFeatureSection = (
  data: FeatureUserUsageResponseData,
): UsageByUserSection => ({
  entries: data.rows.map((row) => ({
    id: row.userId,
    label: row.user?.name || row.userId || "",
    amount: row.value,
  })),
  total: data.total,
  totalUsers: data.totalUsers,
  unattributed: data.unattributed
    ? { id: null, label: "", amount: data.unattributed.value }
    : null,
});

const mutedColor = (isLight: boolean) =>
  isLight ? "hsla(0, 0%, 0%, 0.46)" : "hsla(0, 0%, 100%, 0.46)";

const InitialAvatar = ({ label }: { label: string }) => {
  const { settings } = useEmbed();
  const isLightBackground = useIsLightBackground();
  const initial = (label.trim()[0] ?? "?").toUpperCase();

  return (
    <Flex
      $alignItems="center"
      $justifyContent="center"
      $width="1.75rem"
      $height="1.75rem"
      $flexShrink={0}
      $borderRadius="9999px"
      $background={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.0625)"
          : "hsla(0, 0%, 100%, 0.15)"
      }
    >
      <Text
        $size={11}
        $weight={500}
        $color={settings.theme.typography.text.color}
      >
        {initial}
      </Text>
    </Flex>
  );
};

export const UsageByUser = ({ source, unit }: UsageByUserProps) => {
  const { t } = useTranslation();
  const isLightBackground = useIsLightBackground();
  const { getCreditUsageByUser, getFeatureUsageByUser } = useEmbed();
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<UsageByUserResult>();
  // Bumped by the retry button; the effect keys off it so a retry re-runs the
  // same fetch without the effect having to call setState synchronously.
  const [attempt, setAttempt] = useState(0);

  const { kind, id } = source;
  const sourceKey = `${kind}:${id}`;

  // The result carries the source it was loaded for, so a source change hides
  // the previous one immediately rather than flashing another resource's
  // numbers — and nothing has to be reset when `source` changes.
  const current = result?.sourceKey === sourceKey ? result : undefined;

  useEffect(() => {
    // Cleanup runs before a re-fetch, so a response that has been superseded by
    // a source change or a retry can never overwrite the newer one.
    let active = true;
    const apply = (next: UsageByUserResult) => {
      if (active) {
        setResult(next);
      }
    };

    const receive = (section?: UsageByUserSection) => {
      if (section) {
        apply({ sourceKey, section });
      }
    };

    const fail = (err: unknown) =>
      apply({ sourceKey, error: isError(err) ? err : ERROR_UNKNOWN });

    // Request only what the expanded list can render; the response reports the
    // period's own totals so the remainder stays accurate on a partial page.
    if (kind === "credit") {
      getCreditUsageByUser(id, EXPANDED_COUNT)
        ?.then((response) =>
          receive(response && toCreditSection(response.data)),
        )
        .catch(fail);
    } else {
      getFeatureUsageByUser(id, EXPANDED_COUNT)
        ?.then((response) =>
          receive(response && toFeatureSection(response.data)),
        )
        .catch(fail);
    }

    return () => {
      active = false;
    };
  }, [
    attempt,
    getCreditUsageByUser,
    getFeatureUsageByUser,
    id,
    kind,
    sourceKey,
  ]);

  const entries = current?.section?.entries;
  const attributed = useMemo(
    () => [...(entries ?? [])].sort((a, b) => b.amount - a.amount),
    [entries],
  );

  const error = current?.error;
  const total = current?.section?.total ?? 0;
  const totalUsers = current?.section?.totalUsers ?? 0;
  const unattributed = current?.section?.unattributed;

  // Every amount is denominated in `unit`, pluralized against its own value:
  // "1 token", "1,200 tokens".
  const formatAmount = (amount: number) =>
    `${formatNumber(amount)} ${getFeatureName(unit, amount)}`;

  // A failed fetch should not take the surrounding meter down with it: report
  // it in place, offer a retry, and leave the rest of the element intact.
  if (error) {
    return (
      <Flex $flexDirection="column" $gap="0.5rem" $alignItems="flex-start">
        <Text display="heading4">{t("Usage by user")}</Text>

        <Text $weight={500} $color="#DB6669">
          {t("There was a problem retrieving usage by user.")}
        </Text>

        <Button
          type="button"
          onClick={() => setAttempt((prev) => prev + 1)}
          $size="sm"
          $variant="ghost"
          $fullWidth={false}
        >
          {t("Try again")}
        </Button>
      </Flex>
    );
  }

  // Nothing to attribute — the header rollup already covers the company total.
  // This also covers the in-flight case: the section appears once it has
  // something to say, rather than reserving space under every metered feature.
  if (attributed.length === 0 && !unattributed) {
    return null;
  }

  const visible = attributed.slice(
    0,
    expanded ? EXPANDED_COUNT : COLLAPSED_COUNT,
  );
  // totalUsers counts attributed users only; the unattributed rollup always
  // renders when expanded, so it never counts against the remainder.
  const remaining = Math.max(totalUsers - visible.length, 0);
  const expandedUserCount = Math.min(totalUsers, EXPANDED_COUNT);
  const hiddenUsers = Math.max(
    expandedUserCount - Math.min(attributed.length, COLLAPSED_COUNT),
    0,
  );
  // The unattributed rollup renders only when expanded, so it has to count
  // toward whether there is anything to expand to. Keying the toggle off the
  // user count alone left it unreachable for a company with three or fewer
  // named users, which is the common case.
  const shouldShowToggle = hiddenUsers > 0 || Boolean(unattributed);
  // Expanding reveals at most EXPANDED_COUNT users, so the toggle promises what
  // it can actually show: "all" only when the expanded list really is everyone.
  const expandLabel =
    totalUsers > EXPANDED_COUNT
      ? t("Show top X users", { count: EXPANDED_COUNT })
      : hiddenUsers > 0
        ? t("Show all X users", { count: totalUsers })
        : t("Show all");

  const row = (key: string, label: string, amount: number, muted?: boolean) => (
    <Flex key={key} $alignItems="center" $gap="0.75rem" $padding="0.5rem 0">
      <InitialAvatar label={muted ? "?" : label} />
      <Box $flexGrow={1} $overflow="hidden">
        <Text
          display="text"
          $color={muted ? mutedColor(isLightBackground) : undefined}
        >
          {label}
        </Text>
      </Box>
      <Text
        display="text"
        $align="right"
        $color={mutedColor(isLightBackground)}
      >
        {formatAmount(amount)}
      </Text>
    </Flex>
  );

  return (
    <Flex $flexDirection="column" $gap="0.25rem">
      <Text display="heading4">{t("Usage by user")}</Text>

      <Box $marginBottom="0.5rem">
        <Text display="text" $color={mutedColor(isLightBackground)}>
          {t("X used by your team this period", {
            amount: formatAmount(total),
          })}
        </Text>
      </Box>

      {visible.map((entry, index) =>
        row(entry.id || `row-${index}`, entry.label, entry.amount),
      )}

      {expanded &&
        unattributed &&
        row("unattributed", t("Unattributed"), unattributed.amount, true)}

      {expanded && remaining > 0 && (
        <Box $marginTop="0.25rem">
          <Text display="text" $color={mutedColor(isLightBackground)}>
            {t("plus X more", { count: remaining })}
          </Text>
        </Box>
      )}

      {shouldShowToggle && (
        <ExpandListToggle
          isExpanded={expanded}
          onToggle={() => setExpanded((prev) => !prev)}
          expandLabel={expandLabel}
          collapseLabel={t("Show fewer")}
          iconColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.8)"
              : "hsla(0, 0%, 100%, 0.4)"
          }
          $marginTop="0.25rem"
        />
      )}
    </Flex>
  );
};

UsageByUser.displayName = "UsageByUser";
