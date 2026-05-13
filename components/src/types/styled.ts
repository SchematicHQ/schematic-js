export type ComponentStyle = "primary" | "secondary" | "tertiary";

export type TransientCSSProperties = {
  [Property in keyof React.CSSProperties as `$${string & Property}`]: React.CSSProperties[Property];
};

export interface ComponentProps extends TransientCSSProperties {
  children?: React.ReactNode;
}

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
