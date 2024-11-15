import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon, IconRound } from "../../ui";
import { CheckoutStageLabel } from "./styles";

interface NavigationProps {
  name: string;
  index: number;
  activeIndex: number;
  isLast: boolean;
  onClick?: () => void;
}

export const Navigation = ({
  name,
  index,
  activeIndex,
  isLast,
  onClick,
}: NavigationProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();
  const iconSize = `${20 / TEXT_BASE_SIZE}rem`;
  return (
    <>
      <Flex $gap="0.5rem" $alignItems="center">
        {index >= activeIndex ? (
          <Box
            $width={iconSize}
            $height={iconSize}
            $minWidth={iconSize}
            $minHeight={iconSize}
            $borderWidth="2px"
            $borderStyle="solid"
            $borderColor={
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.125)"
                : "hsla(0, 0%, 100%, 0.25)"
            }
            $borderRadius="9999px"
            className="checkout-stage-circle"
          />
        ) : (
          <IconRound
            name="check"
            colors={[
              theme.card.background,
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.125)"
                : "hsla(0, 0%, 100%, 0.25)",
            ]}
            style={{
              fontSize: `${16 / TEXT_BASE_SIZE}rem`,
              width: `${20 / TEXT_BASE_SIZE}rem`,
              height: `${20 / TEXT_BASE_SIZE}rem`,
            }}
            className="checkout-stage-circle"
          />
        )}

        <Box
          tabIndex={0}
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick,
            $cursor: "pointer",
          })}
        >
          <CheckoutStageLabel stage={name}>
            {index + 1}. {name}
          </CheckoutStageLabel>
        </Box>
      </Flex>

      {!isLast && (
        <Icon
          name="chevron-right"
          style={{
            fontSize: 16,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.175)"
              : "hsla(0, 0%, 100%, 0.35)",
          }}
        />
      )}
    </>
  );
};
