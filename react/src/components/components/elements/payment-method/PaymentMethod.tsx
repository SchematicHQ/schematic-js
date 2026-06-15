import { forwardRef } from "react";

import { PaymentMethod as PaymentMethodPrimitive, usePaymentMethod  } from "../../../composable/payment-method";
import { type FontStyle } from "../../../embed";
import type { DeepPartial, ElementProps } from "../../../types";
import { Element } from "../../layout";

import { PaymentMethodElement } from "./PaymentMethodElement";

export interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
    showExpiration: boolean;
  };
}

const resolveDesignProps = (props: DeepPartial<DesignProps>): DesignProps => {
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

/**
 * Default-styled PaymentMethod. A thin wrapper over the headless
 * `PaymentMethod.*` primitives (see `src/components/composable/payment-method`):
 * `Root` resolves the payment method + edit action; the body renders the
 * legacy `PaymentMethodElement`.
 */
export const PaymentMethod = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
      allowEdit?: boolean;
    }
>(({ className, allowEdit = true, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  return (
    <PaymentMethodPrimitive.Root allowEdit={allowEdit}>
      <PaymentMethodBody ref={ref} design={props} className={className} />
    </PaymentMethodPrimitive.Root>
  );
});

PaymentMethod.displayName = "PaymentMethod";

interface PaymentMethodBodyProps {
  design: DesignProps;
  className?: string;
}

const PaymentMethodBody = forwardRef<
  HTMLDivElement | null,
  PaymentMethodBodyProps
>(({ design, className }, ref) => {
  const { paymentMethod, monthsToExpiration, customCheckoutFields, onEdit } =
    usePaymentMethod();

  return (
    <Element ref={ref} className={className}>
      <PaymentMethodElement
        customCheckoutFields={customCheckoutFields}
        paymentMethod={paymentMethod}
        monthsToExpiration={monthsToExpiration}
        {...(onEdit && { onEdit })}
        {...design}
      />
    </Element>
  );
});

PaymentMethodBody.displayName = "PaymentMethodBody";
