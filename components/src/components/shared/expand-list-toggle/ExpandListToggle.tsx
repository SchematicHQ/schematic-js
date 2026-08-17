import { useTranslation } from "react-i18next";

import { type FontStyle } from "../../../context";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Flex, Icon, Text, type BoxProps } from "../../ui";

interface ExpandListToggleProps extends BoxProps {
  isExpanded: boolean;
  onToggle: () => void;
  /** When provided, the collapsed label reads "See all (18)". */
  total?: number;
  /** Override for surfaces with different vocabulary, e.g. "See more". */
  expandLabel?: string;
  collapseLabel?: string;
  iconColor?: string;
  /** Label typography; defaults to the theme's link style. */
  fontStyle?: FontStyle;
  /** Renders the control as another element, e.g. a row of a list. */
  as?: React.ElementType;
}

/**
 * Expand/collapse affordance for a truncated list, pairing with
 * `useTruncatedList`.
 *
 * Renders exactly one element and imposes no wrapper, margin, or list
 * semantics of its own — spacing comes from caller-passed props. That contract
 * is what lets a CSS-table caller wrap this in its own `table-row`/`table-cell`
 * without terminating the run of table rows that forms the anonymous table box.
 */
export const ExpandListToggle = ({
  isExpanded,
  onToggle,
  total,
  expandLabel,
  collapseLabel,
  iconColor = "#D0D0D0",
  fontStyle = "link",
  ...rest
}: ExpandListToggleProps) => {
  const { t } = useTranslation();

  const label = isExpanded
    ? (collapseLabel ?? t("Hide all"))
    : (expandLabel ??
      (typeof total === "number" ? t("See all X", { total }) : t("See all")));

  return (
    // The chevron is the most affordance-looking part of the control, so the
    // whole row is the target — one tab stop, one hit area, label included.
    <Flex
      $alignItems="center"
      $gap="0.25rem"
      $cursor="pointer"
      $width="fit-content"
      {...rest}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={createKeyboardExecutionHandler(onToggle)}
    >
      <Icon
        name={isExpanded ? "chevron-up" : "chevron-down"}
        color={iconColor}
        style={{ marginLeft: `-${1 / 3}rem` }}
      />

      <Text display={fontStyle}>{label}</Text>
    </Flex>
  );
};
