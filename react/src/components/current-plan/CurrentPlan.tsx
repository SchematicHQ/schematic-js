import { useTheme } from "styled-components";
import { RecursivePartial } from "../../types";
import { Box } from "../box";
import { Flex } from "../flex";
import { Text } from "../text";
import { Container, Button } from "./styles";

interface ContentProps {
  name: string;
  description: string;
  price: number;
  addOns: {
    name: string;
    price: number;
  }[];
  usageBased: {
    name: string;
    type: string;
    price: number;
    amount: number;
  }[];
  callToAction: string;
}

interface TextDesignProps {
  isVisible?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

interface DesignProps {
  header: {
    isVisible: boolean;
    title: TextDesignProps;
    description: TextDesignProps;
    price: TextDesignProps;
  };
  addOns: {
    isVisible: boolean;
  };
  usageBased: {
    isVisible: boolean;
  };
  callToAction: {
    isVisible: boolean;
    size: "sm" | "md" | "lg";
    color: string;
    backgroundColor: string;
  };
}

export interface CurrentPlanProps
  extends RecursivePartial<DesignProps>,
    React.HTMLAttributes<HTMLDivElement> {
  contents: ContentProps;
}

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

export const CurrentPlan = ({
  className,
  contents,
  style = {},
  ...props
}: CurrentPlanProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);

  const theme = useTheme();

  return (
    <Container className={className} style={style}>
      <Flex $flexDirection="column" $gap={`${12 / 16}rem`} $margin="0 0 3rem">
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
                {contents.name}
              </Text>
            </Box>
            {designPropsWithDefaults.header.description.isVisible && (
              <Text
                $font={designPropsWithDefaults.header.description.fontFamily}
                $size={`${designPropsWithDefaults.header.description.fontSize / 16}rem`}
                $weight={`${designPropsWithDefaults.header.description.fontWeight}`}
                $color={designPropsWithDefaults.header.description.color}
              >
                {contents.description}
              </Text>
            )}
          </div>
          <Text
            $font={designPropsWithDefaults.header.price.fontFamily}
            $size={`${designPropsWithDefaults.header.price.fontSize / 16}`}
            $weight={`${designPropsWithDefaults.header.price.fontWeight}`}
            $color={designPropsWithDefaults.header.price.color}
          >
            ${contents.price}/mo
          </Text>
        </Flex>

        {/* TODO: finish resolving props below */}

        {designPropsWithDefaults.addOns && (
          <>
            <Text
              $size={`${15 / 16}rem`}
              $weight="500"
              $color={theme.textDetail}
            >
              Add-Ons
            </Text>

            <Box $width="100%" $margin="0 0 1rem">
              {contents.addOns.map((addon) => (
                <Flex
                  key={addon.name}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $width="100%"
                >
                  <Text $font="Manrope" $size={`${18 / 16}rem`} $weight="800">
                    {addon.name}
                  </Text>
                  <Text $weight="500">${addon.price}/mo</Text>
                </Flex>
              ))}
            </Box>
          </>
        )}

        {designPropsWithDefaults.addOns && (
          <>
            <Text
              $size={`${15 / 16}rem`}
              $weight="500"
              $color={theme.textDetail}
            >
              Usage-Based
            </Text>

            {contents.usageBased.map((addon) => (
              <Flex
                key={addon.name}
                $justifyContent="space-between"
                $alignItems="center"
                $width="100%"
              >
                <Text $font="Manrope" $size={`${18 / 16}rem`} $weight="800">
                  {addon.name}
                </Text>
                <Flex $flexDirection="column" $alignItems="center">
                  <Text $weight="500">
                    ${addon.price}/{addon.type}
                  </Text>
                  <Text $size={`${14 / 16}rem`} $color={theme.textDetail}>
                    {addon.amount} {addon.type} | $
                    {(addon.price || 0) * (addon.amount || 0)}
                  </Text>
                </Flex>
              </Flex>
            ))}
          </>
        )}
      </Flex>

      <Button
        $size={designPropsWithDefaults.callToAction.size}
        $color={designPropsWithDefaults.callToAction.color}
        $backgroundColor={designPropsWithDefaults.callToAction.backgroundColor}
      >
        {contents.callToAction}
      </Button>
    </Container>
  );
};
