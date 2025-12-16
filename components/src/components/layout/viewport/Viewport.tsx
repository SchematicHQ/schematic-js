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

    const checkoutDialogRef = useRef<HTMLDialogElement>(null);
    const unsubscribeDialogRef = useRef<HTMLDialogElement>(null);
    const paymentDialogRef = useRef<HTMLDialogElement>(null);

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

    useLayoutEffect(() => {
      switch (layout) {
        case "checkout":
          checkoutDialogRef.current?.showModal();
          unsubscribeDialogRef.current?.close();
          paymentDialogRef.current?.close();
          break;
        case "unsubscribe":
          checkoutDialogRef.current?.close();
          unsubscribeDialogRef.current?.showModal();
          paymentDialogRef.current?.close();
          break;
        case "payment":
          checkoutDialogRef.current?.close();
          unsubscribeDialogRef.current?.close();
          paymentDialogRef.current?.showModal();
          break;
        default:
          checkoutDialogRef.current?.close();
          unsubscribeDialogRef.current?.close();
          paymentDialogRef.current?.close();
      }
    }, [layout]);

    const isBadgeVisible =
      !data?.capabilities?.badgeVisibility ||
      settings.badge?.visibility !== "hidden";

    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          {isBadgeVisible && <Badge />}
        </StyledViewport>

        {createPortal(
          <CheckoutDialog ref={checkoutDialogRef} top={top} />,
          portal,
        )}

        {createPortal(
          <UnsubscribeDialog ref={unsubscribeDialogRef} top={top} />,
          portal,
        )}

        {createPortal(
          <PaymentDialog ref={paymentDialogRef} top={top} />,
          portal,
        )}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
