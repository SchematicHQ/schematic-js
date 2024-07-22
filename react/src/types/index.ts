import CSS from "csstype";

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

type CSSProps = {
  [Property in keyof CSS.Properties as `$${string & Property}`]: CSS.Properties[Property];
};
export interface ComponentProps extends CSSProps {
  children?: React.ReactNode;
}
