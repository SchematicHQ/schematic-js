import { forwardRef } from "react";
import { ComponentStyle, ElementProps, RecursivePartial } from "../../../types";
import { useTranslation } from "react-i18next";
import { ButtonSizeTypes, EmbedButton, Flex } from "../../ui";
import { Element } from "../../layout";
import {
  EmbedButtonAlignment,
  EmbedButtonColor,
  EmbedButtonVariant,
} from "../../ui/button/EmbedButton";

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
      >
        {t(props.button.text)}
      </EmbedButton>
    </Element>
  );
});

UnsubscribeButton.displayName = "UnsubscribeButton";
