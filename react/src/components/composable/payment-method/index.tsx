// PaymentMethod composable namespace.
//
//   <PaymentMethod.Root>
//     <PaymentMethod.Label>{({ data }) => …}</PaymentMethod.Label>
//     <PaymentMethod.Expiration>{({ monthsToExpiration }) => …}</PaymentMethod.Expiration>
//     <PaymentMethod.EditTrigger>Edit</PaymentMethod.EditTrigger>
//     <PaymentMethod.Empty>No payment method</PaymentMethod.Empty>
//   </PaymentMethod.Root>

import { Root } from "./Root";
import { EditTrigger, Empty, Expiration, Label } from "./parts";

export const PaymentMethod = Object.assign(Root, {
  Root,
  Label,
  Expiration,
  EditTrigger,
  Empty,
});

export {
  PaymentMethodContext,
  usePaymentMethod,
  type PaymentMethodContextValue,
  type PaymentMethodOptions,
} from "./context";
export {
  getPaymentMethodData,
  type PaymentMethodDisplayData,
} from "./getPaymentMethodData";
export type { PaymentMethodRootProps } from "./Root";
export type { EditTriggerProps } from "./parts";
