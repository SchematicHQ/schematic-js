import { forwardRef } from "react";
import { Card } from "../card";

export interface ColumnProps {
  children?: React.ReactNode;
  className?: string;
}

export const Column = forwardRef<HTMLDivElement | null, ColumnProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={className}>
        <Card>{children}</Card>
      </div>
    );
  },
);
