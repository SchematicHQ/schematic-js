import { useTranslation } from "react-i18next";

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
  ...rest
}: ExpandListToggleProps) => {
  const { t } = useTranslation();

  const label = isExpanded
    ? (collapseLabel ?? t("Hide all"))
    : (expandLabel ??
      (typeof total === "number" ? t("See all X", { total }) : t("See all")));

  return (
    <Flex $alignItems="center" $gap="0.25rem" {...rest}>
      <Icon
        name={isExpanded ? "chevron-up" : "chevron-down"}
        color={iconColor}
        style={{ marginLeft: `-${1 / 3}rem` }}
      />

      <Text
        role="button"
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={createKeyboardExecutionHandler(onToggle)}
        display="link"
      >
        {label}
      </Text>
    </Flex>
  );
};
