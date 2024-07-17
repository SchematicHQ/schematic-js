import { Icon } from "../icon";

export const Invoices = () => {
  return (
    <div className="p-8">
      <div className="relative z-[1] bg-white flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-base">Invoices</div>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">May 12, 2024</span>
            <span className="text-gray-400">$315.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">May 12, 2024</span>
            <span className="text-gray-400">$315.00</span>
          </div>
        </div>
        <div className="flex flex-row space-x-2 items-center">
          <Icon name="chevron-down" className="text-gray-400 leading-none" />
          <span className="text-blue-400 font-medium font-display text-sm">
            See all
          </span>
        </div>
      </div>
    </div>
  );
};
