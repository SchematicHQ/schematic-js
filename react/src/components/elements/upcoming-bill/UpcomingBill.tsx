import { forwardRef } from "react";
import type { RecursivePartial, ElementProps } from "../../../types";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: string;
    prefix: string;
  };
  price: {
    isVisible: boolean;
    fontStyle: string;
  };
  contractEndDate: {
    isVisible: boolean;
    fontStyle: string;
    prefix: string;
  };
}

export type UpcomingBillProps = ElementProps &
  RecursivePartial<DesignProps> &
  React.HTMLAttributes<HTMLDivElement>;

function resolveDesignProps(props: RecursivePartial<DesignProps>) {
  const designProps: DesignProps = {
    header: {
      isVisible: props.header?.isVisible || true,
      fontStyle: props.header?.fontStyle || "Header 3",
      prefix: props.header?.prefix || "Next bill due",
    },
    price: {
      isVisible: props.price?.isVisible || true,
      fontStyle: props.header?.fontStyle || "Metric",
    },
    contractEndDate: {
      isVisible: props.contractEndDate?.isVisible || true,
      fontStyle: props.header?.fontStyle || "Subtitle",
      prefix: props.header?.prefix || "Contract ends",
    },
  };

  return designProps;
}

export const UpcomingBill = forwardRef<
  HTMLDivElement | null,
  UpcomingBillProps
>(({ className, ...props }, ref) => {
  const designPropsWithDefaults = resolveDesignProps(props);

  return (
    <div ref={ref} className={className}>
      {designPropsWithDefaults.header.isVisible && (
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-base">
            {designPropsWithDefaults.header.prefix} June 12, 2024
          </div>
        </div>
      )}

      <div className="flex items-center leading-none justify-between">
        {designPropsWithDefaults.price.isVisible && (
          <div className="flex flex-row items-end flex-1 font-medium font-display text-gray-700">
            <div className="text-lg mr-0.5 translate-y-[3px]">$</div>
            <div className="text-3xl">315.00</div>
          </div>
        )}

        <div className="text-gray-400 text-xs max-w-[160px]">
          Estimated monthly bill.
          {designPropsWithDefaults.contractEndDate.isVisible && (
            <>&nbsp;{designPropsWithDefaults.contractEndDate.prefix} 5/12/25.</>
          )}
        </div>
      </div>
    </div>
  );
});
