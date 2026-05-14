import { type CompanyPlanWithBillingSubView } from "../../../api/checkoutexternal";
import { FontStyle } from "../../../embed";
import { formatCurrency, shortenPeriod } from "../../../utils";
import { Flex, Text } from "../../ui";

interface AddOnProps {
  addOn: CompanyPlanWithBillingSubView;
  currency?: string;
  period?: string;
  layout: {
    addOns: {
      isVisible: boolean;
      fontStyle: FontStyle;
      showLabel: boolean;
    };
  };
}

export const AddOn = ({ addOn, currency, period, layout }: AddOnProps) => {
  const resolvedPeriod =
    addOn.planPeriod === "one-time"
      ? addOn.planPeriod
      : (period ?? addOn.planPeriod);

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Text display={layout.addOns.fontStyle}>{addOn.name}</Text>

      {typeof addOn.planPrice === "number" && resolvedPeriod && (
        <Text>
          {formatCurrency(addOn.planPrice, currency)}
          <sub>
            {resolvedPeriod === "one-time"
              ? shortenPeriod(resolvedPeriod)
              : `/${shortenPeriod(resolvedPeriod)}`}
          </sub>
        </Text>
      )}
    </Flex>
  );
};
