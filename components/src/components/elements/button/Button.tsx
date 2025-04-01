import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { ComponentStyle, ElementProps, RecursivePartial } from "../../../types";
import { Element } from "../../layout";
import {
  ButtonSizeTypes,
  EmbedButton,
  type EmbedButtonAlignment,
  type EmbedButtonColor,
  type EmbedButtonSelfAlignment,
  type EmbedButtonVariant,
  Flex,
} from "../../ui";

interface DesignProps {
  button: {
    link: string;
    openInNewTab: boolean;
    text: string;
    style: ComponentStyle;
    size: ButtonSizeTypes;
    fullWidth: boolean;
    alignment: EmbedButtonAlignment;
    selfAlignment: EmbedButtonSelfAlignment;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    button: {
      link: props.button?.link ?? "",
      openInNewTab: props.button?.openInNewTab ?? true,
      text: props.button?.text ?? "Button",
      style: props.button?.style ?? "primary",
      size: props.button?.size ?? "md",
      fullWidth: props.button?.fullWidth ?? true,
      alignment: props.button?.alignment ?? "center",
      selfAlignment: props.button?.selfAlignment ?? "center",
    },
  };
};

export type ButtonElementProps = DesignProps;

export const ButtonElement = forwardRef<
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
        as="a"
        href={props.button.link}
        target={props.button.openInNewTab ? "_blank" : "_self"}
        $size={props.button.size}
        $color={buttonStyles[props.button.style].color}
        $variant={buttonStyles[props.button.style].variant}
        $alignment={props.button.alignment}
        $selfAlignment={props.button.selfAlignment}
        $fullWidth={props.button.fullWidth}
      >
        {t(props.button.text) ?? t("Button")}
      </EmbedButton>
    </Element>
  );
});

ButtonElement.displayName = "Button";
