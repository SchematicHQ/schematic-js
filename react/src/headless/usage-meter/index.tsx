// UsageMeter headless namespace. The default export is `Root`, with every
// part attached as a static for Radix-style dot-notation:
//
//   <UsageMeter.Root flag="seats">
//     <UsageMeter.Empty>No limit configured</UsageMeter.Empty>
//     <UsageMeter.Track>
//       <UsageMeter.Fill />
//     </UsageMeter.Track>
//     <UsageMeter.Value>{({ usage, allocation }) => `${usage} / ${allocation}`}</UsageMeter.Value>
//   </UsageMeter.Root>

import { Root } from "./Root";
import { Empty, Fill, Track, Value } from "./parts";

export const UsageMeter = Object.assign(Root, {
  Root,
  Track,
  Fill,
  Value,
  Empty,
});

export {
  UsageMeterContext,
  useUsageMeterContext,
  type UsageMeterData,
} from "./context";
export type { UsageMeterRootProps } from "./Root";
export type { FillProps, TrackProps, ValueRenderProps } from "./parts";
