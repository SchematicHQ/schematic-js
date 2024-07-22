import styled from "styled-components";
import { attr } from "../../utils";
import { Box, type BoxProps } from "../box";

export interface FlexProps extends BoxProps {
  $dir?: BoxProps["$flexDirection"];
  $basis?: BoxProps["$flexBasis"];
}

export const Flex = styled(Box)<FlexProps>`
  display: flex;
  ${({ $dir }) => attr("flex-direction", $dir)};
  ${({ $basis }) => attr("flex-basis", $basis)};
`;
