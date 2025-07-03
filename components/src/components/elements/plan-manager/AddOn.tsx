import { type CompanyPlanWithBillingSubView } from "../../../api/checkoutexternal";
import { FontStyle } from "../../../context";
import { formatCurrency, shortenPeriod } from "../../../utils";
import { Flex, Text } from "../../ui";

interface AddOnProps {
  addOn: CompanyPlanWithBillingSubView;
  currency?: string;
  fontStyle?: FontStyle;
}

export const AddOn = ({ addOn, currency, fontStyle }: AddOnProps) => {
  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Text display={fontStyle}>{addOn.name}</Text>

      {addOn.planPrice && addOn.planPeriod && (
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
