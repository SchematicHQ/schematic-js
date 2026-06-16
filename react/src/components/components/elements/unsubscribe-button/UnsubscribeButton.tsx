import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import {
  UnsubscribeButton as UnsubscribeButtonPrimitive,
  useUnsubscribeButton,
} from "../../../composable/unsubscribe-button";
import { ComponentStyle, DeepPartial, ElementProps } from "../../../types";
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

export interface DesignProps {
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
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  return (
    <UnsubscribeButtonPrimitive.Root>
      <UnsubscribeButtonBody ref={ref} design={props} className={className} />
    </UnsubscribeButtonPrimitive.Root>
  );
});

UnsubscribeButton.displayName = "UnsubscribeButton";

interface UnsubscribeButtonBodyProps {
  design: DesignProps;
  className?: string;
}

const UnsubscribeButtonBody = forwardRef<
  HTMLDivElement | null,
  UnsubscribeButtonBodyProps
>(({ design, className }, ref) => {
  const { t } = useTranslation();
  const { hasActiveSubscription, unsubscribe } = useUnsubscribeButton();

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
        onClick={unsubscribe}
        $size={design.button.size}
        $color={buttonStyles[design.button.style].color}
        $variant={buttonStyles[design.button.style].variant}
        $alignment={design.button.alignment}
        $fullWidth={design.button.fullWidth}
      >
        {t(design.button.text) ?? t("Unsubscribe")}
      </Button>
    </Element>
  );
});

UnsubscribeButtonBody.displayName = "UnsubscribeButtonBody";
