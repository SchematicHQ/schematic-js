import { decode, toWire } from "@schematichq/schematic-js";

import { SCENARIOS, type ScenarioName } from "./scenarios";

/**
 * Every fixture scenario survives a trip through the proposed wire format
 * and back, so the TS fixtures double as wire examples and the decoder is
 * proven against every field the elements read.
 */
describe("wire round trip", () => {
  test.each(Object.keys(SCENARIOS) as ScenarioName[])("%s", (name) => {
    const data = SCENARIOS[name]();
    const wire = toWire(data) as Record<string, unknown>;
    expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/); // no camelCase on the wire
    expect(decode(JSON.parse(JSON.stringify(wire)))).toEqual(data);
  });
});
