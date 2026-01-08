import debounce from "lodash/debounce";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EVENT_DEBOUNCE_TIMEOUT } from "../../../const";
import { Box, type BoxProps } from "../../ui";

import { Content, Trigger } from "./styles";

export type Position = "top" | "right" | "bottom" | "left";

type GetCoordsArgs = {
  element?: HTMLElement | null;
  portal?: HTMLElement | null;
  position?: Position;
};

const getCoords = ({ element, portal, position }: GetCoordsArgs) => {
  const { top: offsetTop, left: offsetLeft } = (
    portal || document.body
  ).getBoundingClientRect();

  let x = 0;
  let y = 0;

  if (element) {
    const rect = element.getBoundingClientRect();

    x = position === "left" ? rect.left : rect.right;
    if (position === "top" || position === "bottom") {
      x -= rect.width / 2;
    }

    y = position === "top" ? rect.top : rect.bottom;
    if (position === "left" || position === "right") {
      y -= rect.height / 2;
    }
  }

  return {
    x: Math.round(x - offsetLeft),
    y: Math.round(y - offsetTop),
  };
};

export interface TooltipProps extends BoxProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  portal?: HTMLElement | null;
  position?: Position;
  fullWidth?: boolean;
}

export const Tooltip = ({
  trigger,
  content,
  portal,
  position = "top",
  fullWidth = false,
  ...rest
}: TooltipProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const updateCoords = useCallback(() => {
    const coords = getCoords({
      element: triggerRef.current,
      portal,
      position,
    });
    setCoords(coords);
  }, [portal, position]);

  useLayoutEffect(() => {
    updateCoords();

    const handleResize = debounce(updateCoords, EVENT_DEBOUNCE_TIMEOUT);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [updateCoords]);

  return (
    <Box $position="relative">
      <Trigger
        ref={triggerRef}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onPointerEnter={() => setShow(true)}
        onPointerLeave={() => setShow(false)}
        $fullWidth={fullWidth}
        {...rest}
      >
        {trigger}
      </Trigger>

      {show &&
        createPortal(
          <Content {...coords} position={position}>
            {content}
          </Content>,
          portal || document.body,
        )}
    </Box>
  );
};
