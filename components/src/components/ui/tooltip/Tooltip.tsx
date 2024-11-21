import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type BoxProps } from "../../ui";
import { Content, Trigger } from "./styles";

interface TooltipProps extends BoxProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  zIndex?: number;
}

export const Tooltip = ({
  trigger,
  content,
  zIndex,
  ...rest
}: TooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top),
      });
    }
  }, [trigger]);

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
          <Content position={position} zIndex={zIndex}>
            {content}
          </Content>,
          document.body,
        )}
    </>
  );
};
