import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { ComponentStyle, ElementProps, RecursivePartial } from "../../../types";
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

interface DesignProps {
  button: {
    text: string;
    style: ComponentStyle;
    size: ButtonSize;
    fullWidth: boolean;
    alignment: ButtonAlignment;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
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
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);
  const { t } = useTranslation();

  const { data, setLayout } = useEmbed();

  const disabled = useMemo(() => {
    return (
      isCheckoutData(data) &&
      (!data.subscription ||
        data.subscription.status === "cancelled" ||
        data.subscription.cancelAtPeriodEnd)
    );
  }, [data]);

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

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="2rem"
    >
      <Button
        $size={props.button.size}
        $color={buttonStyles[props.button.style].color}
        $variant={buttonStyles[props.button.style].variant}
        $alignment={props.button.alignment}
        $fullWidth={props.button.fullWidth}
        onClick={() => {
          setLayout("unsubscribe");
        }}
        disabled={disabled}
      >
        {t(props.button.text) ?? t("Unsubscribe")}
      </Button>
    </Element>
  );
});

UnsubscribeButton.displayName = "UnsubscribeButton";
