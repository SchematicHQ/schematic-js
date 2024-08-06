import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import type { RecursivePartial, ElementProps, FontStyle } from "../../../types";
import { Box, Flex, Icon, Text } from "../../ui";
import { StyledButton } from "./styles";

interface DesignProps {
  header: {
    isVisible: boolean;
    title: {
      fontStyle?: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle?: FontStyle;
    };
    price: {
      isVisible: boolean;
      fontStyle?: FontStyle;
    };
  };
  addOns: {
    isVisible: boolean;
    fontStyle?: FontStyle;
    showLabel: boolean;
  };
  callToAction: {
    isVisible: boolean;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      title: {
        fontStyle: props.header?.title?.fontStyle,
      },
      description: {
        isVisible: props.header?.description?.isVisible ?? true,
        fontStyle: props.header?.description?.fontStyle,
      },
      price: {
        isVisible: props.header?.price?.isVisible ?? true,
        fontStyle: props.header?.price?.fontStyle,
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      fontStyle: props.addOns?.fontStyle,
      showLabel: props.addOns?.showLabel ?? true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible ?? true,
    },
  };
};

export type PlanManagerProps = ElementProps &
  RecursivePartial<DesignProps> &
  React.HTMLAttributes<HTMLDivElement> & {
    domNode?: HTMLElement | null;
  };

export const PlanManager = forwardRef<HTMLDivElement | null, PlanManagerProps>(
  ({ children, className, domNode, ...props }, ref) => {
    const { header, addOns, callToAction } = resolveDesignProps(props);

    const { data, settings, layout, setLayout } = useEmbed();

    const plans = useMemo(() => {
      return (data.company?.plans || []).map(({ name, description }) => {
        return {
          name,
          description,
          /**
           * @TODO: resolve plan/addon prices
           */
          price: undefined,
        };
      });
    }, [data.company?.plans]);

    const plan = plans.at(0);
    const addons = plans.slice(1);

    return (
      <div ref={ref} className={className}>
        <Flex
          $flexDirection="column"
          $gap={`${12 / TEXT_BASE_SIZE}rem`}
          $margin="0 0 3rem"
        >
          {header.isVisible && plan && (
            <Flex
              $justifyContent="space-between"
              $alignItems="center"
              $width="100%"
              $margin="0 0 1.5rem"
            >
              <div>
                <Box $margin="0 0 0.75rem">
                  <Text
                    $font={settings.theme?.typography?.heading1?.fontFamily}
                    $size={settings.theme?.typography?.heading1?.fontSize}
                    $weight={settings.theme?.typography?.heading1?.fontWeight}
                    $color={settings.theme?.typography?.heading1?.color}
                  >
                    {plan.name}
                  </Text>
                </Box>

                {header.description.isVisible && plan.description && (
                  <Text
                    $font={settings.theme?.typography?.text?.fontFamily}
                    $size={settings.theme?.typography?.text?.fontSize}
                    $weight={settings.theme?.typography?.text?.fontWeight}
                    $color={settings.theme?.typography?.text?.color}
                  >
                    {plan.description}
                  </Text>
                )}
              </div>

              {header.price.isVisible && plan.price! >= 0 && (
                <Text
                  $font={settings.theme?.typography?.text?.fontFamily}
                  $size={settings.theme?.typography?.text?.fontSize}
                  $weight={settings.theme?.typography?.text?.fontWeight}
                  $color={settings.theme?.typography?.text?.color}
                >
                  ${plan.price}/mo
                </Text>
              )}
            </Flex>
          )}

          {addOns.isVisible && (
            <>
              <Text $size={15} $weight={500} $color="#767676">
                Add-Ons
              </Text>

              <Box $width="100%" $margin="0 0 1rem">
                {addons.map((addon, index) => (
                  <Flex
                    key={index}
                    $justifyContent="space-between"
                    $alignItems="center"
                    $width="100%"
                  >
                    <Text $font="Manrope" $size={18} $weight={800}>
                      {addon.name}
                    </Text>
                    {addon.price! >= 0 && (
                      <Text $weight={500}>${addon.price}/mo</Text>
                    )}
                  </Flex>
                ))}
              </Box>
            </>
          )}
        </Flex>

        {callToAction.isVisible && (
          <StyledButton
            onClick={() => {
              if (layout !== "checkout") return;
              setLayout("checkout");
            }}
            $color={settings.theme.secondary}
          >
            Change Plan
          </StyledButton>
        )}

        {children}

        {layout === "checkout" &&
          createPortal(
            <Box
              $position="absolute"
              $top="50%"
              $left="50%"
              $zIndex="999999"
              $transform="translate(-50%, -50%)"
              $width="100%"
              $height="100%"
              $backgroundColor="#B5B5B580"
            >
              <Flex
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
                <Box
                  $position="absolute"
                  $top="0.25rem"
                  $right="0.75rem"
                  $cursor="pointer"
                  onClick={() => {
                    setLayout("portal");
                  }}
                >
                  <Icon
                    name="close"
                    style={{ fontSize: 36, color: "#B8B8B8" }}
                  />
                </Box>

                <Flex $flexDirection="column" $gap="1rem">
                  <Text
                    as="h1"
                    id="select-plan-dialog-label"
                    $size={24}
                    $weight={800}
                  >
                    Select plan
                  </Text>

                  <Flex $flexDirection="column" $gap="1rem">
                    {plans.map((plan, index) => (
                      <Flex
                        key={index}
                        $justifyContent="space-between"
                        $alignItems="center"
                        $width="100%"
                      >
                        <Text $size={20} $weight={800}>
                          {plan.name}
                        </Text>
                        {plan.price! >= 0 && <Text>${plan.price}/mo</Text>}
                      </Flex>
                    ))}
                  </Flex>
                </Flex>
              </Flex>
            </Box>,
            domNode || document.body,
          )}
      </div>
    );
  },
);
