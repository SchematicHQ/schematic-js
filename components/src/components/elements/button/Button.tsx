import { forwardRef } from "react";

import { ComponentStyle, ElementProps, RecursivePartial } from "../../../types";
import { Element } from "../../layout";
import {
  Button,
  type ButtonAlignment,
  type ButtonColor,
  type ButtonSelfAlignment,
  type ButtonSize,
  type ButtonVariant,
  Flex,
} from "../../ui";

interface DesignProps {
  button: {
    link: string;
    openInNewTab: boolean;
    text: string;
    style: ComponentStyle;
    size: ButtonSize;
    fullWidth: boolean;
    alignment: ButtonAlignment;
    selfAlignment: ButtonSelfAlignment;
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
        {props.button.text}
      </Button>
    </Element>
  );
});

ButtonElement.displayName = "Button";
