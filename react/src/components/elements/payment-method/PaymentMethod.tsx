export const PaymentMethod = () => {
  return (
    <div className="relative px-8 py-8 bg-white">
      <div className="relative z-[1] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-base">Payment Method</div>
          <div className="text-xs text-red-400">Expires in 4 mo</div>
        </div>
        <div className="flex flex-row justify-between bg-gray-50 text-sm px-4 py-1.5 rounded-full">
          <div className="">💳 Card ending 4512</div>
          <span className="text-blue-400">Edit</span>
        </div>
      </div>
    </div>
  );
};
