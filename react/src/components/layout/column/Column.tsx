import { forwardRef } from "react";
import { Card } from "../card";
import { StyledColumn } from "./styles";

export interface ColumnProps extends React.HTMLProps<HTMLDivElement> {}

export const Column = forwardRef<HTMLDivElement | null, ColumnProps>(
  ({ children, ...props }, ref) => {
    return (
      <StyledColumn ref={ref} {...props}>
        <Card>{children}</Card>
      </StyledColumn>
    );
  },
);
