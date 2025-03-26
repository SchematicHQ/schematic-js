import debounce from "lodash/debounce";
import { forwardRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useEmbed } from "../../../hooks";
import { CheckoutDialog, PaymentDialog, UnsubscribeDialog } from "../../shared";
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
      const setModalY = debounce(() => {
        const value = Math.abs(
          (parent === document.body ? window.scrollY : parent.scrollTop) ?? 0,
        );
        console.debug(value);
        setTop(value);
      }, 250);

      parent.style.overflow =
        layout === "checkout" ||
        layout === "unsubscribe" ||
        layout === "payment"
          ? "hidden"
          : "";

      window.addEventListener("scroll", setModalY);

      return () => {
        window.removeEventListener("scroll", setModalY);
        parent.style.overflow = "";
      };
    }, [portal, layout]);

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
        {layout === "payment" &&
          createPortal(<PaymentDialog top={top} />, portal || document.body)}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
