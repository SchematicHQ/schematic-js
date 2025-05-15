import { forwardRef } from "react";

import { type FontStyle } from "../../../context";
import {
  ElementProps,
  RecursivePartial,
  type ComponentProps,
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

  return (
    <Element as={Flex} ref={ref} className={className}>
      <Text
        display={props.text.fontStyle}
        $align={props.text.alignment}
        $width="100%"
      >
        {props.text.textContent}
      </Text>
    </Element>
  );
});

TextElement.displayName = "Text";
