import CSS from "csstype";

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

type CSSProp = keyof CSS.Properties;
type TransientCSSProp<S extends string> = `$${S}`;
type TransientCSSKeys = TransientCSSProp<CSSProp>;
type CSSProps = {
  [Property in TransientCSSKeys]?: string;
};
export interface ComponentProps extends CSSProps {
  children?: React.ReactNode;
}
