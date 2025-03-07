import { forwardRef } from "react";
import { ComponentStyle, ElementProps, RecursivePartial } from "../../../types";
import { useTranslation } from "react-i18next";
import { Element } from "../../layout";
import {
  ButtonSizeTypes,
  EmbedButton,
  type EmbedButtonAlignment,
  type EmbedButtonColor,
  type EmbedButtonVariant,
  Flex,
} from "../../ui";
import { useEmbed } from "../../../hooks";

interface DesignProps {
  button: {
    text: string;
    style: ComponentStyle;
    size: ButtonSizeTypes;
    fullWidth: boolean;
    alignment: EmbedButtonAlignment;
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

  const disabled =
    !data.subscription ||
    data.subscription.status === "cancelled" ||
    data.subscription.cancelAtPeriodEnd;

  const buttonStyles: Record<
    ComponentStyle,
    { color: EmbedButtonColor; variant: EmbedButtonVariant }
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
      <EmbedButton
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
      </EmbedButton>
    </Element>
  );
});

UnsubscribeButton.displayName = "UnsubscribeButton";
