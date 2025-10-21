import debounce from "lodash/debounce";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EVENT_DEBOUNCE_TIMEOUT } from "../../../const";
import { type BoxProps } from "../../ui";

import { Content, Trigger } from "./styles";

export type Position = "top" | "right" | "bottom" | "left";

type GetCoordsOptions = {
  position: Position;
};

const getCoords = (element: HTMLElement, { position }: GetCoordsOptions) => {
  const { top: offsetTop, left: offsetLeft } =
    document.body.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  let x = position === "left" ? rect.left : rect.right;
  if (position === "top" || position === "bottom") {
    x -= rect.width / 2;
  }

  let y = position === "top" ? rect.top : rect.bottom;
  if (position === "left" || position === "right") {
    y -= rect.height / 2;
  }

  return {
    x: Math.round(x - offsetLeft),
    y: Math.round(y - offsetTop),
  };
};

export interface TooltipProps extends BoxProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: Position;
  fullWidth?: boolean;
}

export const Tooltip = ({
  trigger,
  content,
  position = "top",
  fullWidth = false,
  ...rest
}: TooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const updateCoords = useCallback(() => {
    if (ref.current) {
      setCoords(getCoords(ref.current, { position }));
    }
  }, [position]);

  useLayoutEffect(() => {
    const handleResize = debounce(updateCoords, EVENT_DEBOUNCE_TIMEOUT);
    window.addEventListener("resize", handleResize);

    updateCoords();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateCoords]);

  return (
    <>
      <Trigger
        ref={ref}
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
          document.body,
        )}
    </>
  );
};
