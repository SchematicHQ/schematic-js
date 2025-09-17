import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { type PreviewSubscriptionFinanceResponseData } from "../../../api/checkoutexternal";
import type { SelectedPlan } from "../../../types";
import { formatCurrency } from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";

type ProrationProps = {
  currency: string;
  financePreview: PreviewSubscriptionFinanceResponseData;
  selectedPlan?: SelectedPlan;
};

export const Proration = ({ currency, financePreview }: ProrationProps) => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((open) => !open);
  };

  return (
    <>
      <Box $opacity="0.625">
        <Text $size={14}>{t("Proration")}</Text>
      </Box>
      <Flex $flexDirection="column" $gap="0.5rem">
        {open &&
          financePreview?.upcomingInvoiceLineItems.map(
            ({ amount, description }, index) => {
              return (
                <Flex key={index} $gap="1rem">
                  <Text>{description}</Text>
                  <Text>{formatCurrency(amount, currency)}</Text>
                </Flex>
              );
            },
          )}
        <Flex $justifyContent="space-between" $alignItems="center" $gap="1rem">
          <Flex>
            <Text display="heading4">{t("Total")}</Text>
            <Button
              type="button"
              onClick={toggle}
              style={{ height: "auto", padding: 0 }}
              $variant="text"
            >
              <Icon name={open ? "chevron-up" : "chevron-down"} />
              <Text>{open ? t("Hide details") : t("Show details")}</Text>
            </Button>
          </Flex>

          <Flex>
            <Text>{formatCurrency(financePreview.proration, currency)}</Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};
