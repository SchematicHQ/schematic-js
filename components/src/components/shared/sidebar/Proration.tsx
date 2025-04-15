import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type { PreviewSubscriptionFinanceResponseData } from "../../../api/checkoutexternal";
import type { SelectedPlan } from "../../../hooks";
import { formatCurrency } from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";

type ProrationProps = {
  currency: string;
  charges: PreviewSubscriptionFinanceResponseData;
  selectedPlan?: SelectedPlan;
};

export const Proration = ({
  currency,
  charges,
  selectedPlan,
}: ProrationProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((open) => !open);
  };

  return (
    <>
      <Box $opacity="0.625">
        <Text
          $font={theme.typography.text.fontFamily}
          $size={14}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {charges.proration > 0
            ? t("Proration")
            : !selectedPlan?.companyCanTrial && t("Credits")}
        </Text>
      </Box>
      <Flex $flexDirection="column" $gap="0.5rem">
        {open &&
          charges?.upcomingInvoiceLineItems.map(
            ({ amount, description }, index) => {
              return (
                <Flex key={index} $gap="1rem">
                  <Text
                    $font={theme.typography.heading4.fontFamily}
                    $size={theme.typography.heading4.fontSize}
                    $weight={theme.typography.heading4.fontWeight}
                    $color={theme.typography.heading4.color}
                  >
                    {description}
                  </Text>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(amount, currency)}
                  </Text>
                </Flex>
              );
            },
          )}
        <Flex $justifyContent="space-between" $alignItems="center" $gap="1rem">
          <Flex>
            <Text
              $font={theme.typography.heading4.fontFamily}
              $size={theme.typography.heading4.fontSize}
              $weight={theme.typography.heading4.fontWeight}
              $color={theme.typography.heading4.color}
            >
              {t("Total")}
            </Text>
            <Button variant="link" onClick={toggle}>
              <Icon name={open ? "chevron-up" : "chevron-down"} />
              <Text
                $font={theme.typography.link.fontFamily}
                $size={theme.typography.link.fontSize}
                $weight={theme.typography.link.fontWeight}
                $color={theme.typography.link.color}
                $leading={1}
                style={{ cursor: "pointer" }}
              >
                {open ? t("Hide details") : t("Show details")}
              </Text>
            </Button>
          </Flex>

          <Flex>
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {formatCurrency(charges.proration, currency)}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};
