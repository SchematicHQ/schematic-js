import debounce from "lodash/debounce";
import { forwardRef, useLayoutEffect, useMemo, useState } from "react";
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

    const Dialog = useMemo(() => {
      if ((data.capabilities?.checkout ?? true) && layout === "checkout") {
        return CheckoutDialog;
      }

      if (layout === "unsubscribe") {
        return UnsubscribeDialog;
      }

      if (layout === "payment") {
        return PaymentDialog;
      }

      return null;
    }, [data.capabilities?.checkout, layout]);

    useLayoutEffect(() => {
      const parent = portal || document.body;
      const setModalY = debounce(() => {
        const value = Math.abs(
          (parent === document.body ? window.scrollY : parent.scrollTop) ?? 0,
        );
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

        {Dialog && createPortal(<Dialog top={top} />, portal || document.body)}
      </>
    );
  },
);

Viewport.displayName = "Viewport";
