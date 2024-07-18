import { useTheme } from "styled-components";
import { RecursivePartial } from "../../types";
import { Container, Flex, BlockText, Button } from "./styles";

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
      <Flex
        $flexDirection="column"
        $gap="0.75rem"
        style={{ marginBottom: "3rem" }}
      >
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $width="100%"
        >
          <div>
            <BlockText
              $font={designPropsWithDefaults.header.title.fontFamily}
              $size={designPropsWithDefaults.header.title.fontSize}
              $weight={designPropsWithDefaults.header.title.fontWeight}
              $color={designPropsWithDefaults.header.title.color}
              $margin="0 0 0.75rem"
            >
              {contents.name}
            </BlockText>
            {designPropsWithDefaults.header.description.isVisible && (
              <BlockText
                $font={designPropsWithDefaults.header.description.fontFamily}
                $size={designPropsWithDefaults.header.description.fontSize}
                $weight={designPropsWithDefaults.header.description.fontWeight}
                $color={designPropsWithDefaults.header.description.color}
                $margin="0 0 1.5rem"
              >
                {contents.description}
              </BlockText>
            )}
          </div>
          <BlockText
            $font={designPropsWithDefaults.header.price.fontFamily}
            $size={designPropsWithDefaults.header.price.fontSize}
            $weight={designPropsWithDefaults.header.price.fontWeight}
            $color={designPropsWithDefaults.header.price.color}
          >
            ${contents.price}/mo
          </BlockText>
        </Flex>

        {/* TODO: finish resolving props below */}

        {designPropsWithDefaults.addOns && (
          <>
            <BlockText $size={15} $weight={500} $color={theme.textDetail}>
              Add-Ons
            </BlockText>

            <div style={{ width: "100%", marginBottom: "1rem" }}>
              {contents.addOns.map((addon) => (
                <Flex
                  key={addon.name}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $width="100%"
                >
                  <BlockText $font="Manrope" $size={18} $weight={800}>
                    {addon.name}
                  </BlockText>
                  <BlockText $weight={500}>${addon.price}/mo</BlockText>
                </Flex>
              ))}
            </div>
          </>
        )}

        {designPropsWithDefaults.addOns && (
          <>
            <BlockText $size={15} $weight={500} $color={theme.textDetail}>
              Usage-Based
            </BlockText>

            {contents.usageBased.map((addon) => (
              <Flex
                key={addon.name}
                $justifyContent="space-between"
                $alignItems="center"
                $width="100%"
              >
                <BlockText $font="Manrope" $size={18} $weight={800}>
                  {addon.name}
                </BlockText>
                <Flex $flexDirection="column" $alignItems="center">
                  <BlockText $weight={500}>
                    ${addon.price}/{addon.type}
                  </BlockText>
                  <BlockText $size={14} $color={theme.textDetail}>
                    {addon.amount} {addon.type} | $
                    {(addon.price || 0) * (addon.amount || 0)}
                  </BlockText>
                </Flex>
              </Flex>
            ))}
          </>
        )}
      </Flex>

      <Button
        size={designPropsWithDefaults.callToAction.size}
        $color={designPropsWithDefaults.callToAction.color}
        $backgroundColor={designPropsWithDefaults.callToAction.backgroundColor}
      >
        {contents.callToAction}
      </Button>
    </Container>
  );
};
