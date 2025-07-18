import { type ComponentHydrateResponseData } from "../../api/checkoutexternal";
import type { HydrateData } from "../../types";

export function isHydrateData(data?: unknown): data is HydrateData {
  return typeof data === "object" && data !== null && "activePlans" in data;
}

export function isCheckoutData(
  data?: unknown,
): data is ComponentHydrateResponseData {
  return typeof data === "object" && data !== null && "company" in data;
}
