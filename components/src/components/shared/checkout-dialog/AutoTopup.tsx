import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PlanCreditGrantView } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { formatCurrency, getFeatureName } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";

interface AutoTopupProps {
  isLoading: boolean;
  includedCreditGrants: PlanCreditGrantView[];
  autoTopupConfigs: Map<
    string,
    Pick<
      PlanCreditGrantView,
      | "billingCreditAutoTopupEnabled"
      | "billingCreditAutoTopupThresholdCredits"
      | "billingCreditAutoTopupAmount"
    >
  >;
  updateAutoTopupConfig: (
    id: string,
    config: {
      billingCreditAutoTopupEnabled?: boolean;
      billingCreditAutoTopupThresholdCredits?: number;
      billingCreditAutoTopupAmount?: number;
    },
  ) => void;
  currency?: string;
}

export const AutoTopup = ({
  isLoading,
  includedCreditGrants,
  autoTopupConfigs,
  updateAutoTopupConfig,
  currency,
}: AutoTopupProps) => {
  const { settings } = useEmbed();

  const { t } = useTranslation();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const unitPriceFontSize = 0.875 * settings.theme.typography.text.fontSize;

  const configurableCreditGrants = useMemo(() => {
    return includedCreditGrants.reduce((acc: PlanCreditGrantView[], grant) => {
      if (
        grant.billingCreditAutoTopupEnabled &&
        grant.billingCreditAutoTopupSelfService
      ) {
        const config = autoTopupConfigs.get(grant.id);
        acc.push({
          ...grant,
          ...config,
        });
      }

      return acc;
    }, []);
  }, [includedCreditGrants, autoTopupConfigs]);

  return (
    <Flex $flexDirection="column" $gap="1rem">
      {configurableCreditGrants.map((grant, index) => {
        return (
          <Flex
            key={index}
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
            $padding={`${cardPadding}rem`}
            $backgroundColor={settings.theme.card.background}
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
            {...(settings.theme.card.hasShadow && {
              $boxShadow: cardBoxShadow,
            })}
          >
            <Flex
              $flexDirection="column"
              $gap="0.75rem"
              $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
            >
              {grant?.credit && (
                <>
                  <Box>
                    {/* TODO: localize */}
                    <Text display="heading2">
                      {getFeatureName(grant.credit, 1)} Auto Top-up
                    </Text>
                  </Box>

                  <Box $marginBottom="0.5rem">
                    <Text>
                      {/* TODO: localize */}
                      Automatically purchase more{" "}
                      {getFeatureName(grant.credit, 2)} when your balance is low
                    </Text>
                  </Box>
                </>
              )}
            </Flex>

            <Flex
              $flexDirection="column"
              $gap="0.5rem"
              $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
            >
              <Input
                $size="lg"
                type="number"
                defaultValue={
                  grant.billingCreditAutoTopupThresholdCredits ?? ""
                }
                min={0}
                autoFocus
                onFocus={(event) => {
                  event.target.select();
                }}
                onChange={(event) => {
                  event.preventDefault();

                  const value = parseInt(event.target.value);
                  if (!isNaN(value)) {
                    updateAutoTopupConfig(grant.id, {
                      billingCreditAutoTopupThresholdCredits: value,
                    });
                  }
                }}
              />
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
};
