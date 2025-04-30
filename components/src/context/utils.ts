import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";

// TODO: find a better way to map types
export function mapPublicDataToHydratedData(
  data: PublicPlansResponseData,
): Partial<ComponentHydrateResponseData> {
  return {
    activePlans: data.activePlans.map((plan) => ({
      ...plan,
      active: false,
      companyCanTrial: false,
      current: false,
      valid: true,
    })),
    activeAddOns: data.activeAddOns.map((addOn) => ({
      ...addOn,
      active: false,
      companyCanTrial: false,
      current: false,
      valid: true,
    })),
    capabilities: {
      badgeVisibility: data.capabilities?.badgeVisibility ?? false,
      checkout: true,
    },
  };
}
