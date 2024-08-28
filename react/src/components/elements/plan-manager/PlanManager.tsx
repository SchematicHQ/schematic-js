import { forwardRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Box, Flex, Icon, Text } from "../../ui";
import { CheckoutForm } from "./CheckoutForm";
import { StyledButton } from "./styles";

interface DesignProps {
  header: {
    isVisible: boolean;
    title: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    price: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
  };
  addOns: {
    isVisible: boolean;
    fontStyle: FontStyle;
    showLabel: boolean;
  };
  callToAction: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary" | "tertiary";
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      title: {
        fontStyle: props.header?.title?.fontStyle ?? "heading1",
      },
      description: {
        isVisible: props.header?.description?.isVisible ?? true,
        fontStyle: props.header?.description?.fontStyle ?? "text",
      },
      price: {
        isVisible: props.header?.price?.isVisible ?? true,
        fontStyle: props.header?.price?.fontStyle ?? "text",
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      fontStyle: props.addOns?.fontStyle ?? "heading4",
      showLabel: props.addOns?.showLabel ?? true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible ?? true,
      buttonSize: props.callToAction?.buttonSize ?? "md",
      buttonStyle: props.callToAction?.buttonStyle ?? "secondary",
    },
  };
};

export type PlanManagerProps = DesignProps;

export const PlanManager = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const [planPeriod /*, setPlanPeriod */] = useState<"month" | "year">("month");

  const { data, settings, layout, setLayout } = useEmbed();

  const { plan, canChangePlan } = useMemo(() => {
    const canChangePlan = data.stripeEmbed?.publishableKey;
    const availablePlans = data.activePlans?.map(
      ({ name, description, current, monthlyPrice, yearlyPrice }) => ({
        name,
        description,
        price:
          planPeriod === "month" ? monthlyPrice?.price : yearlyPrice?.price,
        current,
      }),
    );

    return {
      plan: data.company?.plan,
      canChangePlan,
      currentPlan: availablePlans?.find((plan) => plan.current === true),
      availablePlans,
    };
  }, [data.company, data.stripeEmbed, data.activePlans, planPeriod]);

  return (
    <div ref={ref} className={className}>
      <Flex
        $flexDirection="column"
        $gap="0.75rem"
        {...(canChangePlan && { $margin: "0 0 0.5rem" })}
      >
        {props.header.isVisible && plan && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $width="100%"
            {...(canChangePlan && { $margin: "0 0 1.5rem" })}
          >
            <div>
              <Box $margin="0 0 0.75rem">
                <Text
                  $font={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontFamily
                  }
                  $size={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontSize
                  }
                  $weight={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontWeight
                  }
                  $color={
                    settings.theme.typography[props.header.title.fontStyle]
                      .color
                  }
                  $lineHeight={1}
                >
                  {plan.name}
                </Text>
              </Box>

              {props.header.description.isVisible && plan.description && (
                <Text
                  $font={
                    settings.theme.typography[
                      props.header.description.fontStyle
                    ].fontFamily
                  }
                  $size={
                    settings.theme.typography[
                      props.header.description.fontStyle
                    ].fontSize
                  }
                  $weight={
                    settings.theme.typography[
                      props.header.description.fontStyle
                    ].fontWeight
                  }
                  $color={
                    settings.theme.typography[
                      props.header.description.fontStyle
                    ].color
                  }
                >
                  {plan.description}
                </Text>
              )}
            </div>

            {props.header.price.isVisible &&
              plan.planPrice! >= 0 &&
              plan.planPeriod && (
                <Text
                  $font={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontFamily
                  }
                  $size={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontSize
                  }
                  $weight={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontWeight
                  }
                  $color={
                    settings.theme.typography[props.header.price.fontStyle]
                      .color
                  }
                >
                  ${plan.planPrice}/{plan.planPeriod}
                </Text>
              )}
          </Flex>
        )}
      </Flex>

      {canChangePlan && props.callToAction.isVisible && (
        <StyledButton
          onClick={() => {
            setLayout("checkout");
          }}
          $size={props.callToAction.buttonSize}
          $color={props.callToAction.buttonStyle}
        >
          <Text
            $font={settings.theme.typography.text.fontFamily}
            $size={settings.theme.typography.text.fontSize}
            $weight={settings.theme.typography.text.fontWeight}
          >
            Change Plan
          </Text>
        </StyledButton>
      )}

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(
          <Box
            $position="absolute"
            $top="50%"
            $left="50%"
            $zIndex="999999"
            $transform="translate(-50%, -50%)"
            $width="100%"
            $height="100%"
            $backgroundColor="#D9D9D9"
          >
            <Box
              $position="relative"
              $top="50%"
              $left="50%"
              $transform="translate(-50%, -50%)"
              $width="956px"
              $height="700px"
              $backgroundColor="#FBFBFB"
              $borderRadius="8px"
              $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
              id="select-plan-dialog"
              role="dialog"
              aria-labelledby="select-plan-dialog-label"
              aria-modal="true"
            >
              <Flex
                $justifyContent="flex-end"
                $cursor="pointer"
                onClick={() => {
                  setLayout("portal");
                }}
              >
                <Icon
                  name="close"
                  style={{
                    fontSize: 36,
                    lineHeight: 1,
                    padding: "0.875rem",
                    color: "#B8B8B8",
                  }}
                />
              </Flex>

              <Flex $flexDirection="column" $gap="1rem" $width="100%">
                <CheckoutForm />
              </Flex>
            </Box>
          </Box>,
          portal || document.body,
        )}
    </div>
  );
});
