import debounce from "lodash/debounce";
import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    const portalRef = useRef<HTMLElement>(portal || document.body);

    const { data, layout, settings } = useEmbed();

    const [top, setTop] = useState(0);

    const { canCheckout, isBadgeVisible } = useMemo(() => {
      return {
        canCheckout: data?.capabilities?.checkout ?? true,
        isBadgeVisible:
          !data?.capabilities?.badgeVisibility ||
          settings.badge?.visibility !== "hidden",
      };
    }, [
      data?.capabilities?.badgeVisibility,
      data?.capabilities?.checkout,
      settings.badge?.visibility,
    ]);

    useLayoutEffect(() => {
      const portal = portalRef.current;
      const setModalY = debounce(() => {
        const value = Math.abs(
          (portal === document.body ? window.scrollY : portal.scrollTop) ?? 0,
        );
        setTop(value);
      }, 250);

      portal.style.overflow =
        layout === "checkout" ||
        layout === "unsubscribe" ||
        layout === "payment"
          ? "hidden"
          : "";

      window.addEventListener("scroll", setModalY);

      return () => {
        window.removeEventListener("scroll", setModalY);
        portal.style.overflow = "";
      };
    }, [layout]);

    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          {isBadgeVisible && <Badge />}
        </StyledViewport>

        {canCheckout &&
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
