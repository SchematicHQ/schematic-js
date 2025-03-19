import { forwardRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { CheckoutDialog, UnsubscribeDialog } from "../../shared";
import { Badge } from "../../ui/badge";
import { RenderLayout } from "../RenderLayout";
import { StyledViewport } from "./styles";

export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {
  portal?: HTMLElement | null;
}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, portal, ...props }, ref) => {
    const { data, layout, settings } = useEmbed();

    const [top, setTop] = useState(0);

    const canCheckout = data.capabilities?.checkout ?? true;

    useLayoutEffect(() => {
      const parent = portal || document.body;
      setTop(
        Math.abs(
          (parent === document.body ? window.scrollY : parent.scrollTop) ?? 0,
        ),
      );

      parent.style.overflow =
        layout === "checkout" || layout === "unsubscribe" ? "hidden" : "";

      return () => {
        parent.style.overflow = "";
      };
    }, [layout, portal]);

    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          {(!data.capabilities?.badgeVisibility ||
            settings.badge?.visibility !== "hidden") && <Badge />}
        </StyledViewport>

        {canCheckout &&
          layout === "checkout" &&
          createPortal(<CheckoutDialog top={top} />, portal || document.body)}
        {layout === "unsubscribe" &&
          createPortal(
            <UnsubscribeDialog top={top} />,
            portal || document.body,
          )}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
