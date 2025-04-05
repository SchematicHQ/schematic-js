import { expect, test } from "@playwright/experimental-ct-react";

import { EmbedProvider } from "../../../context";
import { PricingTable } from ".";

test("should work", async ({ mount }) => {
  const component = await mount(
    <EmbedProvider mode="standalone">
      <PricingTable />
    </EmbedProvider>,
  );
  await expect(component).toContainText("Plans");
});
