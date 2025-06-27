import { type ComponentHydrateResponseData } from "../../api/checkoutexternal";
import { type PublicPlansResponseData } from "../../api/componentspublic";

export function isHydrateData(
  data?: unknown,
): data is PublicPlansResponseData | ComponentHydrateResponseData {
  return typeof data === "object" && data !== null && "activePlans" in data;
}

export function isCheckoutData(
  data?: unknown,
): data is ComponentHydrateResponseData {
  return typeof data === "object" && data !== null && "company" in data;
}
