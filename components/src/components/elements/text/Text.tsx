import { forwardRef } from "react";
import { useTheme } from "styled-components";

import type { FontStyle } from "../../../context";
import {
  type ComponentProps,
  ElementProps,
  RecursivePartial,
} from "../../../types";
import { Element } from "../../layout";
import { Flex, Text } from "../../ui";

interface DesignProps {
  text: {
    fontStyle: FontStyle;
    alignment: ComponentProps["$textAlign"];
    textContent: string;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    text: {
      fontStyle: props.text?.fontStyle ?? "text",
      alignment: props.text?.alignment ?? "left",
      textContent: props.text?.textContent ?? "Text",
    },
  };
};

export type TextElementProps = DesignProps;

export const TextElement = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);
  const theme = useTheme();

  return (
    <Element as={Flex} ref={ref} className={className}>
      <Text
        $font={theme.typography[props.text.fontStyle].fontFamily}
        $size={theme.typography[props.text.fontStyle].fontSize}
        $weight={theme.typography[props.text.fontStyle].fontWeight}
        $color={theme.typography[props.text.fontStyle].color}
        $align={props.text.alignment}
        $width="100%"
      >
        {props.text.textContent}
      </Text>
    </Element>
  );
});

TextElement.displayName = "Text";
