import styled from "styled-components";
import CSS from "csstype";
import { camelToHyphen, attr } from "../../utils";
import { type ComponentProps } from "../../types";

export type BoxProps = ComponentProps;

export const Box = styled.div<BoxProps>((props) => {
  return Object.entries(props).reduce(
    (acc, [key, value]) => {
      console.log(key);
      if (key.startsWith("$")) {
        acc.push(
          attr(
            camelToHyphen(key.slice(1)) as keyof CSS.PropertiesHyphen,
            value,
          ),
        );
      }
      return acc;
    },
    [] as ReturnType<typeof attr>[],
  );
});
