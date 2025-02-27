import { Children, forwardRef } from "react";
import { Card } from "../card";
import { StyledColumn } from "./styles";

export interface ColumnProps extends React.HTMLProps<HTMLDivElement> {
  basis?: string;
}

export const Column = forwardRef<HTMLDivElement | null, ColumnProps>(
  ({ children, basis, ...props }, ref) => {
    return Children.count(children) === 0 ? (
      <StyledColumn ref={ref} {...props}>
        {children}
      </StyledColumn>
    ) : (
      <StyledColumn ref={ref} {...props}>
        <Card>{children}</Card>
      </StyledColumn>
    );
  },
);

Column.displayName = "Column";
