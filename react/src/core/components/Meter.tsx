import { useSchematicEntitlement } from "..";

export interface MeterProps {
  id: string;
}

export const Meter = ({ id }: MeterProps) => {
  const entitlement = useSchematicEntitlement(id);

  if (typeof entitlement.featureAllocation !== "number") {
    return;
  }

  const max = entitlement.featureAllocation;
  const low = entitlement.featureAllocation / 3;
  const high = (entitlement.featureAllocation * 2) / 3;
  const optimum = entitlement.featureAllocation / 2;

  return (
    <meter
      id={id}
      value={entitlement.featureUsage}
      min={0}
      max={max}
      low={low}
      high={high}
      optimum={optimum}
    />
  );
};
