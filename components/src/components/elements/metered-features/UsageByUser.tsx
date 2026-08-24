import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  CreditUserUsageResponseData,
  FeatureUserUsageResponseData,
} from "../../../api/checkoutexternal";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatNumber } from "../../../utils";
import { Box, Flex, Icon, Text } from "../../ui";

// Collapsed state shows the top N users by usage; the rest (plus the
// unattributed row) reveal on "Show all".
const COLLAPSED_COUNT = 3;

// Cap the expanded list too: a company can have thousands of users, and an
// inline list that long is unusable. The remainder is reported as a count.
// Exported so the fetch can request exactly what the list can render.
export const EXPANDED_COUNT = 20;

export interface UsageByUserEntry {
  // Stable key for the row; undefined/null for the unattributed rollup.
  id?: string | null;
  // Display name (often an email).
  label: string;
  amount: number;
}

// UsageByUserSection is one API section (a feature or a credit) reshaped for
// this component: the page of entries plus the period-wide figures the page
// itself can't convey.
// UsageByUserSource is the resource whose per-user breakdown to load. Features
// and credits are separate endpoints — each is one ordered list of users — so
// the section fetches its own rather than sharing a composite response.
export type UsageByUserSource =
  { kind: "feature"; id: string } | { kind: "credit"; id: string };

interface UsageByUserSection {
  entries: UsageByUserEntry[];
  total: number;
  totalUsers: number;
  unattributed?: UsageByUserEntry | null;
}

interface UsageByUserProps {
  source: UsageByUserSource;
  // The feature's unit, e.g. "credits" or a feature's plural noun.
  unit: string;
}

// toCreditSection / toFeatureSection reshape the two endpoint payloads onto the
// one shape this component renders. The API already excludes the unattributed
// rollup from entries and from total_users, so neither needs deriving here.
const toCreditSection = (
  data: CreditUserUsageResponseData,
): UsageByUserSection => ({
  entries: data.entries.map((entry) => ({
    id: entry.userId,
    label: entry.user?.name ?? "",
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
    label: row.user?.name ?? "",
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
  const [section, setSection] = useState<UsageByUserSection>();

  const { kind, id } = source;
  useEffect(() => {
    let active = true;
    const apply = (next: UsageByUserSection) => {
      if (active) {
        setSection(next);
      }
    };

    // Request only what the expanded list can render; the response reports the
    // period's own totals so the remainder stays accurate on a partial page.
    if (kind === "credit") {
      getCreditUsageByUser(id, EXPANDED_COUNT)?.then(
        (response) => response && apply(toCreditSection(response.data)),
      );
    } else {
      getFeatureUsageByUser(id, EXPANDED_COUNT)?.then(
        (response) => response && apply(toFeatureSection(response.data)),
      );
    }

    return () => {
      active = false;
    };
  }, [getCreditUsageByUser, getFeatureUsageByUser, id, kind]);

  const attributed = useMemo(
    () => [...(section?.entries ?? [])].sort((a, b) => b.amount - a.amount),
    [section?.entries],
  );

  const total = section?.total ?? 0;
  const totalUsers = section?.totalUsers ?? 0;
  const unattributed = section?.unattributed;

  // Nothing to attribute — the header rollup already covers the company total.
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
  const shouldShowToggle = totalUsers > COLLAPSED_COUNT;

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
        {`${formatNumber(amount)} ${unit}`}
      </Text>
    </Flex>
  );

  return (
    <Flex $flexDirection="column" $gap="0.25rem">
      <Text display="heading4">{t("Usage by user")}</Text>

      <Box $marginBottom="0.5rem">
        <Text display="text" $color={mutedColor(isLightBackground)}>
          {t("X used by your team this period", {
            amount: `${formatNumber(total)} ${unit}`,
          })}
        </Text>
      </Box>

      {visible.map((entry) =>
        row(entry.id ?? entry.label, entry.label, entry.amount),
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
        <Flex $gap="0.25rem" $alignItems="center" $marginTop="0.25rem">
          <Icon
            name="chevron-down"
            color={
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.8)"
                : "hsla(0, 0%, 100%, 0.4)"
            }
            style={{
              marginLeft: `-${1 / 3}rem`,
              ...(expanded && { transform: "rotate(180deg)" }),
            }}
          />
          <Text display="link" onClick={() => setExpanded((prev) => !prev)}>
            {expanded
              ? t("Show fewer")
              : t("Show all X users", { count: totalUsers })}
          </Text>
        </Flex>
      )}
    </Flex>
  );
};

UsageByUser.displayName = "UsageByUser";
