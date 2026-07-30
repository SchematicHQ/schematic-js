import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatNumber } from "../../../utils";
import { Box, Flex, Icon, Text } from "../../ui";

// Collapsed state shows the top N users by usage; the rest (plus the
// unattributed row) reveal on "Show all".
const COLLAPSED_COUNT = 3;

export interface UsageByUserEntry {
  // Stable key for the row; undefined/null for the unattributed rollup.
  id?: string | null;
  // Display name (often an email). Ignored for the unattributed row, which
  // renders localized "Unattributed" copy instead.
  label: string;
  amount: number;
  isUnattributed?: boolean;
}

interface UsageByUserProps {
  entries: UsageByUserEntry[];
  // The feature's unit, e.g. "credits" or a feature's plural noun.
  unit: string;
}

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
        isLightBackground ? "hsla(0, 0%, 0%, 0.0625)" : "hsla(0, 0%, 100%, 0.15)"
      }
    >
      <Text $size={11} $weight={500} $color={settings.theme.typography.text.color}>
        {initial}
      </Text>
    </Flex>
  );
};

export const UsageByUser = ({ entries, unit }: UsageByUserProps) => {
  const { t } = useTranslation();
  const isLightBackground = useIsLightBackground();
  const [expanded, setExpanded] = useState(false);

  const { attributed, unattributed, total } = useMemo(() => {
    const attributed = entries
      .filter((entry) => !entry.isUnattributed)
      .sort((a, b) => b.amount - a.amount);
    const unattributed = entries.find((entry) => entry.isUnattributed);
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { attributed, unattributed, total };
  }, [entries]);

  // Nothing to attribute — the header rollup already covers the company total.
  if (attributed.length === 0 && !unattributed) {
    return null;
  }

  const visible = expanded
    ? attributed
    : attributed.slice(0, COLLAPSED_COUNT);
  const totalUsers = attributed.length + (unattributed ? 1 : 0);
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

      {expanded && unattributed && (
        row("unattributed", t("Unattributed"), unattributed.amount, true)
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
