import { forwardRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { CheckoutDialog } from "../../shared";
import { Badge } from "../../ui/badge";
import { RenderLayout } from "../RenderLayout";
import { StyledViewport } from "./styles";

export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {
  portal?: HTMLElement | null;
}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, portal, ...props }, ref) => {
    const { data, layout } = useEmbed();

    const [top, setTop] = useState(0);

    const canChangePlan = data.capabilities?.checkout ?? true;

    useLayoutEffect(() => {
      if (layout !== "checkout") {
        return;
      }

      const parent = portal || document.body;
      const value = Math.abs(
        (parent === document.body ? window.scrollY : parent.scrollTop) ?? 0,
      );
      setTop(value);

      parent.style.overflow = "hidden";

      return () => {
        parent.style.overflow = "";
      };
    }, [layout, portal]);

    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          <Badge />
        </StyledViewport>

        {canChangePlan &&
          layout === "checkout" &&
          createPortal(<CheckoutDialog top={top} />, portal || document.body)}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
