import { Children, forwardRef } from "react";
import { Card } from "../card";
import { StyledColumn } from "./styles";

export interface ColumnProps extends React.HTMLProps<HTMLDivElement> {
  basis?: string;
}

export const Column = forwardRef<HTMLDivElement | null, ColumnProps>(
  ({ children, basis, ...props }, ref) => {
    const childrenLength = Children.count(children);

    if (childrenLength === 0) {
      return;
    }

    return (
      <StyledColumn ref={ref} {...props}>
        <Card>{children}</Card>
      </StyledColumn>
    );
  },
);

Column.displayName = "Column";
