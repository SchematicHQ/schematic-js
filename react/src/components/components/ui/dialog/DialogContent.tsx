import { forwardRef } from "react";

import * as styles from "./styles";

interface DialogContentProps {
  children?: React.ReactNode;
}

export const DialogContent = forwardRef<
  HTMLDivElement | null,
  DialogContentProps
>(({ children }, ref) => {
  return <styles.DialogContent ref={ref}>{children}</styles.DialogContent>;
});

DialogContent.displayName = "DialogContent";
