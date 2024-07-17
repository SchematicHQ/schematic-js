import { Icon, IconNameTypes } from "./Icon";

interface IconRoundProps {
  name: IconNameTypes;
  style?: "outline" | "filled";
  size?: "tn" | "sm" | "md" | "lg";
}

export const IconRound = ({
  name,
  style = "filled",
  size = "md",
}: IconRoundProps) => {
  const styleMap = {
    filled: "bg-gray-200 border-gray-200",
    outline: "bg-transparent border-gray-300",
  };

  const textMap = {
    tn: "text-2xl",
    sm: "text-3xl",
    md: "text-4xl",
    lg: "",
  };

  const sizeMap = {
    tn: "w-[30px] h-[30px]",
    sm: "w-[40px] h-[40px]",
    md: "w-[50px] h-[50px]",
    lg: "",
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center border ${styleMap[style]} ${sizeMap[size]}`}
    >
      <Icon name={name} className={textMap[size]} />
    </div>
  );
};
