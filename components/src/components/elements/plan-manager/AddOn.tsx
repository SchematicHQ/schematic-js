import { type CompanyPlanWithBillingSubView } from "../../../api/checkoutexternal";
import { FontStyle } from "../../../context";
import { formatCurrency, shortenPeriod } from "../../../utils";
import { Flex, Text } from "../../ui";

interface AddOnProps {
  addOn: CompanyPlanWithBillingSubView;
  currency?: string;
  layout: {
    addOns: {
      isVisible: boolean;
      fontStyle: FontStyle;
      showLabel: boolean;
    };
  };
}

export const AddOn = ({ addOn, currency, layout }: AddOnProps) => {
  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Text display={layout.addOns.fontStyle}>{addOn.name}</Text>

      {typeof addOn.planPrice === "number" && addOn.planPeriod && (
        <Text>
          {formatCurrency(addOn.planPrice, currency)}
          <sub>
            {addOn.planPeriod == "one-time"
              ? shortenPeriod(addOn.planPeriod)
              : `/${shortenPeriod(addOn.planPeriod)}`}
          </sub>
        </Text>
      )}
    </Flex>
  );
};
