import * as React from "react";
import { StyledContainer } from "./styles";

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

type Spacing = [number, number, number, number];

export interface ContainerProps
  extends Omit<
    React.CSSProperties,
    "margin" | "padding" | "color" | "background"
  > {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fillSpace?: "yes" | "no";
  padding?: Spacing;
  margin?: Spacing;
  color?: RGBAColor;
  background?: RGBAColor;
  shadow?: number;
  radius?: number;
}

export const Container = ({
  children,
  className,
  style,
  flexDirection,
  alignItems,
  justifyContent,
  fillSpace,
  padding,
  margin,
  background,
  color,
  shadow,
  radius,
  width,
  height,
}: ContainerProps) => {
  const initialTransientProps: Omit<React.CSSProperties, "translate"> = {};
  const transientProps = Object.entries({
    flexDirection,
    alignItems,
    justifyContent,
    width,
    height,
    ...(fillSpace === "yes" && { flexGrow: 1 }),
    ...(padding && { padding: padding.map((p) => `${p}px`).join(" ") }),
    ...(margin && { margin: margin.map((m) => `${m}px`).join(" ") }),
    ...(background && {
      background: `rgba(${background.r}, ${background.g}, ${background.b}, ${background.a})`,
    }),
    ...(color && {
      color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
    }),
    ...(radius && { borderRadius: `${radius}px` }),
    ...(typeof shadow === "number" && {
      boxShadow:
        shadow === 0 ? "none" : `0px 3px 100px ${shadow}px rgba(0, 0, 0, 0.13)`,
    }),
  }).reduce((acc, [key, value]) => {
    if (typeof value !== "undefined") {
      return { ...acc, [`$${key}`]: value };
    }

    return acc;
  }, initialTransientProps);

  return (
    <StyledContainer className={className} style={style} {...transientProps}>
      {children}
    </StyledContainer>
  );
};
