import { forwardRef, useMemo } from "react";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { Element } from "../../layout";
import { PaymentMethodElement } from "./PaymentMethodElement";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
    showExpiration: boolean;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
    },
    functions: {
      allowEdit: props.functions?.allowEdit ?? true,
      showExpiration: props.functions?.showExpiration ?? true,
    },
  };
};

export type PaymentMethodProps = DesignProps;

export const PaymentMethod = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
      allowEdit?: boolean;
    }
>(({ children, className, portal, allowEdit = true, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { data, setLayout } = useEmbed();

  const paymentMethod = useMemo(() => {
    return data.subscription?.paymentMethod;
  }, [data.subscription?.paymentMethod]);

  const monthsToExpiration = useMemo(() => {
    let expiration: number | undefined;

    if (
      typeof paymentMethod?.cardExpYear === "number" &&
      typeof paymentMethod?.cardExpMonth === "number"
    ) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const timeToExpiration = Math.round(
        +new Date(paymentMethod.cardExpYear, paymentMethod.cardExpMonth - 1) -
          +new Date(currentYear, currentMonth),
      );
      expiration = Math.round(timeToExpiration / (1000 * 60 * 60 * 24 * 30));
    }
    return expiration;
  }, [paymentMethod?.cardExpYear, paymentMethod?.cardExpMonth]);

  return (
    <Element ref={ref} className={className}>
      <PaymentMethodElement
        paymentMethod={paymentMethod}
        monthsToExpiration={monthsToExpiration}
        {...(allowEdit && { onEdit: () => setLayout("payment") })}
        {...props}
      />
    </Element>
  );
});

PaymentMethod.displayName = "PaymentMethod";
