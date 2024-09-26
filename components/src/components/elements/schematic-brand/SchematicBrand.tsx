import { forwardRef, useMemo } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import {
  Box,
  Flex,
  IconRound,
  ProgressBar,
  Text,
  type IconNameTypes,
} from "../../ui";

interface DesignProps {
  alignment: "start" | "center" | "end";
}

function resolveDesignProps(props: RecursivePartial<DesignProps>): DesignProps {
  return {
    alignment: props.alignment || "start",
  };
}

export type SchematicBrandProps = DesignProps;

export const SchematicBrand = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  return (
    <Flex ref={ref} className={className} $flexDirection="column" $gap="1.5rem" $backgroundColor="red">
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Corporis quos
      sunt voluptatum vero perferendis officia mollitia, alias unde dignissimos,
      suscipit quibusdam dolorem nisi asperiores dolor ut rerum. Qui, molestiae
      iure.
    </Flex>
  );
});
