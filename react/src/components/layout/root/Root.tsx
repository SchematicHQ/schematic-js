import { forwardRef } from "react";

export interface RootProps extends React.HTMLProps<HTMLDivElement> {}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  (props, ref) => {
    return <div ref={ref} {...props} />;
  },
);
