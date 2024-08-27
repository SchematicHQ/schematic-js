import { forwardRef } from "react";

export interface RootProps {
  children?: React.ReactNode;
  className?: string;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  },
);
