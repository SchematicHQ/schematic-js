import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { ComponentStyle, DeepPartial, ElementProps } from "../../../types";
import { isCheckoutData } from "../../../utils";
import { Element } from "../../layout";
import {
  Button,
  ButtonSize,
  Flex,
  type ButtonAlignment,
  type ButtonColor,
  type ButtonVariant,
} from "../../ui";

const buttonStyles: Record<
  ComponentStyle,
  { color: ButtonColor; variant: ButtonVariant }
> = {
  primary: {
    color: "primary",
    variant: "filled",
  },
  secondary: {
    color: "primary",
    variant: "outline",
  },
  tertiary: {
    color: "primary",
    variant: "text",
  },
};

interface DesignProps {
  button: {
    text: string;
    style: ComponentStyle;
    size: ButtonSize;
    fullWidth: boolean;
    alignment: ButtonAlignment;
  };
}

const resolveDesignProps = (props: DeepPartial<DesignProps>): DesignProps => {
  return {
    button: {
      text: props.button?.text ?? "Unsubscribe",
      style: props.button?.style ?? "primary",
      size: props.button?.size ?? "md",
      fullWidth: props.button?.fullWidth ?? true,
      alignment: props.button?.alignment ?? "center",
    },
  };
};

export type UnsubscribeButtonProps = DesignProps;

export const UnsubscribeButton = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);
  const { t } = useTranslation();

  const { data, setLayout } = useEmbed();

  const hasActiveSubscription = useMemo(() => {
    return (
      isCheckoutData(data) &&
      data.subscription &&
      data.subscription.status !== "cancelled" &&
      !data.subscription.cancelAt
    );
  }, [data]);

  if (!hasActiveSubscription) {
    return null;
  }

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="2rem"
    >
      <Button
        type="button"
        onClick={() => {
          setLayout("unsubscribe");
        }}
        $size={props.button.size}
        $color={buttonStyles[props.button.style].color}
        $variant={buttonStyles[props.button.style].variant}
        $alignment={props.button.alignment}
        $fullWidth={props.button.fullWidth}
      >
        {t(props.button.text) ?? t("Unsubscribe")}
      </Button>
    </Element>
  );
});

UnsubscribeButton.displayName = "UnsubscribeButton";
