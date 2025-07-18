import debounce from "lodash/debounce";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EVENT_DEBOUNCE_TIMEOUT } from "../../../const";
import { type BoxProps } from "../../ui";

import { Content, Trigger } from "./styles";

export type Position = "top" | "right" | "bottom" | "left";

export interface TooltipProps extends BoxProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: Position;
}

export const Tooltip = ({
  trigger,
  content,
  position = "top",
  ...rest
}: TooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const updateCoords = useCallback(() => {
    if (ref.current) {
      const { top: offsetTop, left: offsetLeft } =
        document.body.getBoundingClientRect();
      const rect = ref.current.getBoundingClientRect();

      let x = position === "left" ? rect.left : rect.right;
      if (position === "top" || position === "bottom") {
        x -= rect.width / 2;
      }

      let y = position === "top" ? rect.top : rect.bottom;
      if (position === "left" || position === "right") {
        y -= rect.height / 2;
      }

      setCoords({
        x: Math.round(x - offsetLeft),
        y: Math.round(y - offsetTop),
      });
    }
  }, [position]);

  useLayoutEffect(() => {
    const handleResize = debounce(updateCoords, EVENT_DEBOUNCE_TIMEOUT);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateCoords]);

  useLayoutEffect(() => {
    updateCoords();
  }, [updateCoords, show]);

  return (
    <>
      <Trigger
        ref={ref}
        onPointerEnter={() => setShow(true)}
        onPointerLeave={() => setShow(false)}
        {...rest}
      >
        {trigger}
      </Trigger>

      {show &&
        createPortal(
          <Content {...coords} position={position}>
            {content}
          </Content>,
          document.body,
        )}
    </>
  );
};
