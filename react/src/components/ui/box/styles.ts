import styled from "styled-components";
import CSS from "csstype";
import { camelToHyphen, attr } from "../../../utils";
import type { ComponentProps } from "../../../types";

export type BoxProps = ComponentProps;

export const Box = styled.div<BoxProps>((props) => {
  const initialStyles: ReturnType<typeof attr>[] = [];
  return Object.entries(props).reduce((acc, [key, value]) => {
    if (key.startsWith("$")) {
      acc.push(
        // keys will always be CSS properties
        attr(camelToHyphen(key.slice(1)) as keyof CSS.PropertiesHyphen, value),
      );
    }

    return acc;
  }, initialStyles);
});
