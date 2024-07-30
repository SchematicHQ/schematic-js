export const NextBillDue = () => {
  return (
    <div className="bg-white p-8">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-base">Next bill due June 12, 2024</div>
      </div>
      <div className="flex items-center leading-none justify-between">
        <div className="flex flex-row items-end flex-1   font-medium font-display text-gray-700">
          <div className="text-lg mr-0.5 translate-y-[3px]">$</div>
          <div className="text-3xl">315.00</div>
        </div>
        <div className="text-gray-400 text-xs max-w-[160px]">
          Estimated monthly bill, <br />
          Contract ends 5/12/24.
        </div>
      </div>
    </div>
  );
};
