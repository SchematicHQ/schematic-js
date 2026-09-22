import { useState } from "react";

import { type PreviewSubscriptionFinanceResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import { useTranslation } from "../../../localization";
import type { SelectedPlan } from "../../../types";
import { formatCurrency } from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";

type ProrationProps = {
  currency: string;
  charges: PreviewSubscriptionFinanceResponseData;
  selectedPlan?: SelectedPlan;
};

export const Proration = ({ currency, charges }: ProrationProps) => {
  const { t, locale } = useTranslation();

  const { settings } = useEmbed();

  const [open, setOpen] = useState(false);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
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
          charges?.upcomingInvoiceLineItems.map(
            ({ amount, description }, index) => {
              return (
                <Flex key={index} $gap="1rem">
                  <Text>{description}</Text>
                  <Box $whiteSpace="nowrap">
                    <Text>{formatCurrency(amount, { locale, currency })}</Text>
                  </Box>
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
              <Icon
                name={open ? "chevron-up" : "chevron-down"}
                color={settings.theme.typography.text.color}
              />
              <Text>{open ? t("Hide details") : t("Show details")}</Text>
            </Button>
          </Flex>

          <Flex>
            <Text>
              {formatCurrency(charges.proration, {
                locale,
                currency,
              })}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};
