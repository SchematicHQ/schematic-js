import { Children, forwardRef } from "react";

import { Card } from "../card";
import { StyledColumn } from "./styles";

export interface ColumnProps extends React.HTMLProps<HTMLDivElement> {
  basis?: string;
}

export const Column = forwardRef<HTMLDivElement | null, ColumnProps>(
  ({ children, basis, ...props }, ref) => {
    return (
      <StyledColumn ref={ref} {...props}>
        {Children.count(children) > 0 ? <Card>{children}</Card> : children}
      </StyledColumn>
    );
  },
);

Column.displayName = "Column";
