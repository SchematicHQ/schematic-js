import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PlanCreditGrantView } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import {
  formatCurrency,
  getCreditPrice,
  getFeatureName,
  getPriceValue,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text, Toggle } from "../../ui";

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
    return includedCreditGrants.reduce(
      (
        acc: (PlanCreditGrantView & {
          // TODO: remove `billingCreditAutoTopupSelfService` for testing
          billingCreditAutoTopupSelfService: boolean;
          cost?: number;
        })[],
        grant,
      ) => {
        // TODO: remove fallback value for testing
        // @ts-expect-error: not implemented yet
        const isSelfService = grant.billingCreditAutoTopupSelfService ?? true;

        if (grant.billingCreditAutoTopupEnabled && isSelfService) {
          const config = autoTopupConfigs.get(grant.id);
          // TODO: remove passing `billingCreditAutoTopupSelfService` for testing
          const updatedGrant = {
            ...grant,
            ...config,
            billingCreditAutoTopupSelfService: isSelfService,
          };
          const price =
            typeof grant.credit?.price?.priceDecimal === "string"
              ? Number(grant.credit.price.priceDecimal)
              : grant.credit?.price?.price;
          const cost =
            typeof updatedGrant.billingCreditAutoTopupAmount == "number" &&
            typeof price === "number"
              ? updatedGrant.billingCreditAutoTopupAmount * price
              : undefined;

          acc.push({
            ...updatedGrant,
            cost,
          });
        }

        return acc;
      },
      [],
    );
  }, [includedCreditGrants, autoTopupConfigs]);

  return (
    <Flex $flexDirection="column" $gap="1rem">
      {configurableCreditGrants.map((grant, index) => {
        return (
          <Box
            as="section"
            key={index}
            $padding={`${cardPadding}rem`}
            $backgroundColor={settings.theme.card.background}
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
            {...(settings.theme.card.hasShadow && {
              $boxShadow: cardBoxShadow,
            })}
          >
            {grant.credit && (
              <>
                <Box as="h1" $marginBottom="0.25rem">
                  <Text display="heading2">
                    {t("Credit Auto Top-up", {
                      unit: grant.credit.name,
                    })}
                  </Text>
                </Box>

                <Box as="p" $marginBottom="2rem">
                  <Text>
                    {t(
                      "Automatically purchase more credits when your balance is low",
                      { units: getFeatureName(grant.credit) },
                    )}
                  </Text>
                </Box>
              </>
            )}

            <Flex $alignItems="center" $gap="0.5rem" $marginBottom="1rem">
              <Toggle
                id={`${grant.id}-enabled`}
                defaultChecked={grant.billingCreditAutoTopupEnabled}
                onChange={() => {
                  updateAutoTopupConfig(grant.id, {
                    billingCreditAutoTopupEnabled:
                      !grant.billingCreditAutoTopupEnabled,
                  });
                }}
              />
              <Text as="label" htmlFor={`${grant.id}-enabled`}>
                {t("Auto top-up enabled")}
              </Text>
            </Flex>

            {grant.billingCreditAutoTopupSelfService &&
              grant.billingCreditAutoTopupEnabled && (
                <Flex $gap="2rem">
                  <Box>
                    <Box $marginBottom="0.5rem">
                      <Text as="label" htmlFor={`${grant.id}-amount`}>
                        {t("When balance reaches:")}
                      </Text>
                    </Box>

                    <Input
                      id={`${grant.id}-amount`}
                      type="number"
                      defaultValue={grant.billingCreditAutoTopupAmount ?? ""}
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
                            billingCreditAutoTopupAmount: value,
                          });
                        }
                      }}
                      $size="lg"
                    />
                  </Box>

                  <Box>
                    <Box $marginBottom="0.5rem">
                      <Text as="label" htmlFor={`${grant.id}-threshold`}>
                        {t("Top up balance with:")}
                      </Text>
                    </Box>

                    <Input
                      id={`${grant.id}-threshold`}
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
                      $size="lg"
                    />
                  </Box>

                  {typeof grant.cost === "number" && (
                    <Text>{t("for cost", { cost: grant.cost })}</Text>
                  )}
                </Flex>
              )}
          </Box>
        );
      })}
    </Flex>
  );
};
