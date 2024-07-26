import { useMemo } from "react";
import { useTheme } from "styled-components";
import { useSchematicEmbed } from "../../hooks";
import type { RecursivePartial } from "../../types";
import { Box } from "../ui/box";
import { Flex } from "../ui/flex";
import { Text } from "../ui/text";
import { Container, Button } from "./styles";

/* interface ContentProps {
  name?: string;
  description?: string;
  price?: number;
  addOns?: {
    name: string;
    price: number;
  }[];
  usageBased?: {
    name: string;
    type: string;
    price: number;
    amount: number;
  }[];
  callToAction?: string;
} */

interface TextDesignProps {
  isVisible?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

interface DesignProps {
  header?: {
    isVisible: boolean;
    title: TextDesignProps;
    description: TextDesignProps;
    price: TextDesignProps;
  };
  addOns?: {
    isVisible: boolean;
  };
  usageBased?: {
    isVisible: boolean;
  };
  callToAction?: {
    isVisible: boolean;
    size: "sm" | "md" | "lg";
    color: string;
    backgroundColor: string;
  };
}

export type CurrentPlanProps = RecursivePartial<DesignProps> &
  React.HTMLAttributes<HTMLDivElement>;

function resolveDesignProps(props: RecursivePartial<DesignProps>) {
  return {
    header: {
      isVisible: props.header?.isVisible || true,
      title: {
        fontFamily: props.header?.title?.fontFamily || "Manrope",
        fontSize: props.header?.title?.fontSize || 37,
        fontWeight: props.header?.title?.fontWeight || 800,
        color: props.header?.title?.color || "black",
      },
      description: {
        isVisible: props.header?.description?.isVisible || true,
        fontFamily: props.header?.description?.fontFamily || "Public Sans",
        fontSize: props.header?.description?.fontSize || 16,
        fontWeight: props.header?.description?.fontWeight || 400,
        color: props.header?.description?.color || "black",
      },
      price: {
        isVisible: props.header?.price?.isVisible || true,
        fontFamily: props.header?.price?.fontFamily || "Inter",
        fontSize: props.header?.price?.fontSize || 16,
        fontWeight: props.header?.price?.fontWeight || 500,
        color: props.header?.price?.color || "black",
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible || true,
    },
    usageBased: {
      isVisible: props.usageBased?.isVisible || true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible || true,
      size: props.callToAction?.size || "md",
      color: props.callToAction?.color || "white",
      backgroundColor: props.callToAction?.backgroundColor || "black",
    },
  };
}

export const CurrentPlan = (props: CurrentPlanProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);

  const theme = useTheme();

  const { data } = useSchematicEmbed();

  const [plan, ...addons] = useMemo(() => {
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

  return (
    <Container>
      <Flex $flexDirection="column" $gap={`${12 / 16}rem`} $margin="0 0 3rem">
        {designPropsWithDefaults.header.isVisible && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $width="100%"
            $margin="0 0 1.5rem"
          >
            <div>
              <Box $margin="0 0 0.75rem">
                <Text
                  $font={designPropsWithDefaults.header.title.fontFamily}
                  $size={`${designPropsWithDefaults.header.title.fontSize / 16}rem`}
                  $weight={`${designPropsWithDefaults.header.title.fontWeight}`}
                  $color={designPropsWithDefaults.header.title.color}
                >
                  {plan.name}
                </Text>
              </Box>

              {designPropsWithDefaults.header.description.isVisible &&
                plan.description && (
                  <Text
                    $font={
                      designPropsWithDefaults.header.description.fontFamily
                    }
                    $size={`${designPropsWithDefaults.header.description.fontSize / 16}rem`}
                    $weight={`${designPropsWithDefaults.header.description.fontWeight}`}
                    $color={designPropsWithDefaults.header.description.color}
                  >
                    {plan.description}
                  </Text>
                )}
            </div>

            {designPropsWithDefaults.header.price.isVisible &&
              plan.price! >= 0 && (
                <Text
                  $font={designPropsWithDefaults.header.price.fontFamily}
                  $size={`${designPropsWithDefaults.header.price.fontSize / 16}`}
                  $weight={`${designPropsWithDefaults.header.price.fontWeight}`}
                  $color={designPropsWithDefaults.header.price.color}
                >
                  ${plan.price}/mo
                </Text>
              )}
          </Flex>
        )}

        {designPropsWithDefaults.addOns.isVisible && (
          <>
            <Text
              $size={`${15 / 16}rem`}
              $weight="500"
              $color={theme.textDetail}
            >
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
                  <Text $font="Manrope" $size={`${18 / 16}rem`} $weight="800">
                    {addon.name}
                  </Text>
                  {addon.price! >= 0 && (
                    <Text $weight="500">${addon.price}/mo</Text>
                  )}
                </Flex>
              ))}
            </Box>
          </>
        )}
      </Flex>

      {designPropsWithDefaults.callToAction.isVisible && (
        <Button
          $size={designPropsWithDefaults.callToAction.size}
          $color={designPropsWithDefaults.callToAction.color}
          $backgroundColor={
            designPropsWithDefaults.callToAction.backgroundColor
          }
        >
          Change Plan
        </Button>
      )}
    </Container>
  );
};
