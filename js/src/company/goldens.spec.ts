import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ListCompanyInvoicesResponseFromJSON,
  instanceOfCompanyInvoiceResponseData,
} from "./api/company/models";

/**
 * The goldens are real responses recorded by the schematic-api route tests
 * (UPDATE_GOLDENS=1; synced by scripts/sync-goldens.sh). Decoding them
 * through the generated models is the contract-freeze check: a
 * required-field change on either side fails here before it fails a
 * company (RFC 0007).
 */
// Resolved from the package root: vitest rewrites import.meta.url in
// transformed specs, so a cwd-relative path is the stable choice.
const golden = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      join(process.cwd(), "src", "company", "goldens", `${name}.json`),
      "utf8",
    ),
  );

/**
 * The freeze itself: the generated `instanceOf` guards carry every field the
 * spec declares required, so a field added or dropped on either side fails
 * here. Hand-picked assertions do not — they pass a golden that is missing a
 * required field entirely.
 */
function requireContract(ok: boolean, what: string): void {
  if (ok) {
    return;
  }
  throw new Error(
    `${what} is missing a field the generated models declare required. ` +
      "Re-record the goldens against a current schematic-api checkout: " +
      "SCHEMATIC_API_DIR=… js/scripts/sync-goldens.sh",
  );
}

describe("goldens", () => {
  it("company_invoices decodes through the generated models", () => {
    const response = ListCompanyInvoicesResponseFromJSON(
      golden("company_invoices"),
    );

    // The envelope cannot be frozen here yet. The API sends `params`
    // alongside `data` (HandleResponse in api/lib/web/helpers.go), and the
    // generated model declares it required, but the recording harness
    // decodes into `test.NestedResponse`, whose `Params` field is commented
    // out (api/lib/test/requests.go) — so the golden is a re-marshal of a
    // struct that cannot carry it, and re-recording changes nothing. Freeze
    // the rows, which round-trip whole, and leave the envelope to whoever
    // makes RecordGolden keep the raw body.
    expect(response.data.length).toBeGreaterThan(0);
    for (const invoice of response.data) {
      requireContract(
        instanceOfCompanyInvoiceResponseData(invoice),
        `company_invoices data[${invoice.id}]`,
      );
      expect(invoice.createdAt).toBeInstanceOf(Date);
    }
  });
});
