import debounce from "lodash/debounce";
import { forwardRef, useLayoutEffect, useRef, useState } from "react";
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
    portal = portal || document.body;
    const portalRef = useRef(portal);

    const { data, layout, settings } = useEmbed();

    const [top, setTop] = useState(0);

    useLayoutEffect(() => {
      const element = portalRef.current;
      const setModalY = debounce(() => {
        const value = Math.abs(
          (element === document.body ? window.scrollY : element.scrollTop) ?? 0,
        );
        setTop(value);
      }, 250);

      window.addEventListener("scroll", setModalY);

      return () => {
        window.removeEventListener("scroll", setModalY);
      };
    }, []);

    const isBadgeVisible =
      !data?.capabilities?.badgeVisibility ||
      settings.badge?.visibility !== "hidden";

    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          {isBadgeVisible && <Badge />}
        </StyledViewport>

        {layout === "checkout" &&
          createPortal(<CheckoutDialog top={top} />, portal)}

        {layout === "unsubscribe" &&
          createPortal(<UnsubscribeDialog top={top} />, portal)}

        {layout === "payment" &&
          createPortal(<PaymentDialog top={top} />, portal)}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
