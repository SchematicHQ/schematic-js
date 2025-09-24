import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE } from "../../../const";
import type { EmbedSettings } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  ChargeType,
  formatCurrency,
  getAddOnPrice,
  hexToHSL,
  isHydratedPlan,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import type { OverageInfo } from "./helpers";
import { extractOverageInfo, findOverageEntitlement } from "./helpers";

interface AddOnsProps {
  addOns: SelectedPlan[];
  toggle: (id: string) => void;
  isLoading: boolean;
  period: string;
}

export const AddOns = ({ addOns, toggle, isLoading, period }: AddOnsProps) => {
  const { settings } = useEmbed();
  const periodKey = period === "year" ? "yearlyPrice" : "monthlyPrice";

  return (
    <Box
      $display="grid"
      $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
      $gap="1rem"
    >
      {addOns.map((addOn, index) => {
        const { price, currency } = getAddOnPrice(addOn, period) || {};
        const isAddOnValid = isHydratedPlan(addOn) && addOn.valid;
        const isAddOnCurrent = isHydratedPlan(addOn) && addOn.current;

        const overageEntitlement = findOverageEntitlement(addOn.entitlements);
        const overageInfo = extractOverageInfo(
          overageEntitlement,
          period,
          currency,
        );

        return (
          <AddOnCard
            key={index}
            isSelected={addOn.isSelected}
            settings={settings}
          >
            <Flex $flexDirection="column" $gap="0.75rem">
              <AddOnNameDescription
                name={addOn.name}
                description={addOn.description}
              />

              <AddOnPricing
                price={price}
                currency={currency}
                chargeType={addOn.chargeType}
                period={period}
                overageInfo={overageInfo}
                settings={settings}
                periodKey={periodKey}
                addOn={addOn}
              />

              {isAddOnCurrent && <AddOnActiveBadge settings={settings} />}
            </Flex>

            <AddOnActionButton
              isSelected={addOn.isSelected}
              isCurrentPlan={isAddOnCurrent}
              isLoading={isLoading}
              isValid={isAddOnValid}
              onToggle={() => toggle(addOn.id)}
            />
          </AddOnCard>
        );
      })}
    </Box>
  );
};

interface AddOnCardProps {
  isSelected: boolean;
  settings: EmbedSettings;
  children: React.ReactNode;
}

const AddOnCard = ({ isSelected, settings, children }: AddOnCardProps) => {
  return (
    <Flex
      $position="relative"
      $flexDirection="column"
      $gap="2rem"
      $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
      $backgroundColor={settings.theme.card.background}
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $outlineWidth="2px"
      $outlineStyle="solid"
      $outlineColor={isSelected ? settings.theme.primary : "transparent"}
      {...(settings.theme.card.hasShadow && {
        $boxShadow: cardBoxShadow,
      })}
    >
      {children}
    </Flex>
  );
};

interface AddOnPricingProps {
  price?: number;
  currency?: string;
  chargeType?: (typeof ChargeType)[keyof typeof ChargeType];
  period: string;
  overageInfo: OverageInfo | null;
  settings: EmbedSettings;
  periodKey: string;
  addOn: SelectedPlan;
}

const AddOnPricing = ({
  price,
  currency,
  chargeType,
  period,
  overageInfo,
  settings,
  periodKey,
  addOn,
}: AddOnPricingProps) => {
  const { t } = useTranslation();

  if (
    !addOn[periodKey as keyof SelectedPlan] &&
    chargeType !== ChargeType.oneTime
  ) {
    return null;
  }

  return (
    <Flex $flexDirection="column" $gap="0.25rem">
      <Box>
        <Text display="heading2">{formatCurrency(price ?? 0, currency)}</Text>

        <Text
          display="heading2"
          $size={(16 / 30) * settings.theme.typography.heading2.fontSize}
        >
          {chargeType === ChargeType.oneTime ? (
            <> {t("one time")}</>
          ) : (
            `/${period}`
          )}
        </Text>
      </Box>

      {overageInfo && overageInfo.softLimit && (
        <Box>
          <Text $size={0.875} style={{ opacity: 0.8 }}>
            {overageInfo.softLimit} {overageInfo.featureName || "units"}{" "}
            included, then{" "}
            {formatCurrency(overageInfo.perUnitPrice, overageInfo.currency)}/
            {overageInfo.featureName?.toLowerCase() || "unit"}
          </Text>
        </Box>
      )}
    </Flex>
  );
};

interface AddOnNameDescriptionProps {
  name: string;
  description?: string;
}

const AddOnNameDescription = ({
  name,
  description,
}: AddOnNameDescriptionProps) => {
  return (
    <>
      <Box>
        <Text display="heading3">{name}</Text>
      </Box>

      {description && (
        <Box $marginBottom="0.5rem">
          <Text>{description}</Text>
        </Box>
      )}
    </>
  );
};

interface AddOnActiveBadgeProps {
  settings: EmbedSettings;
}

const AddOnActiveBadge = ({ settings }: AddOnActiveBadgeProps) => {
  const { t } = useTranslation();

  return (
    <Flex
      $position="absolute"
      $right="1rem"
      $top="1rem"
      $backgroundColor={settings.theme.primary}
      $borderRadius="9999px"
      $padding="0.125rem 0.85rem"
    >
      <Text
        $size={0.75 * settings.theme.typography.text.fontSize}
        $color={hexToHSL(settings.theme.primary).l > 50 ? "#000000" : "#FFFFFF"}
      >
        {t("Active")}
      </Text>
    </Flex>
  );
};

interface AddOnActionButtonProps {
  isSelected: boolean;
  isCurrentPlan: boolean;
  isLoading: boolean;
  isValid: boolean;
  onToggle: () => void;
}

const AddOnActionButton = ({
  isSelected,
  isCurrentPlan,
  isLoading,
  isValid,
  onToggle,
}: AddOnActionButtonProps) => {
  const { t } = useTranslation();

  return (
    <Flex $flexDirection="column" $justifyContent="end" $flexGrow="1">
      {!isSelected ? (
        <Button
          type="button"
          disabled={isLoading || !isValid}
          onClick={onToggle}
          $size="sm"
          $color="primary"
          $variant="outline"
          $fullWidth
        >
          {t("Choose add-on")}
        </Button>
      ) : (
        <Button
          type="button"
          disabled={isLoading || !isValid}
          onClick={onToggle}
          $size="sm"
          $color={isCurrentPlan ? "danger" : "primary"}
          $variant={isCurrentPlan ? "ghost" : "text"}
          $fullWidth
        >
          {isCurrentPlan ? (
            t("Remove add-on")
          ) : (
            <>
              <Icon name="check-rounded" size="sm" />
              {t("Selected")}
            </>
          )}
        </Button>
      )}
    </Flex>
  );
};
