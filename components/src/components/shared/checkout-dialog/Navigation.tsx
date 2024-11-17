import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon, IconRound, Text } from "../../ui";

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

  return (
    <>
      <Flex $gap="0.5rem" $alignItems="center">
        <Box
          $display="none"
          $viewport={{
            sm: {
              $display: "block",
            },
          }}
        >
          {index >= activeIndex ? (
            <Box
              $width={`${20 / TEXT_BASE_SIZE}rem`}
              $height={`${20 / TEXT_BASE_SIZE}rem`}
              $borderWidth="2px"
              $borderStyle="solid"
              $borderColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.125)"
                  : "hsla(0, 0%, 100%, 0.25)"
              }
              $borderRadius="9999px"
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
            />
          )}
        </Box>

        <Box
          tabIndex={0}
          $fontSize={`${16 / TEXT_BASE_SIZE}rem`}
          $whiteSpace="nowrap"
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick,
            $cursor: "pointer",
          })}
          $viewport={{
            sm: {
              $fontSize: `${19 / TEXT_BASE_SIZE}rem`,
            },
          }}
        >
          <Text
            $font={theme.typography.text.fontFamily}
            $weight={index === activeIndex ? 600 : 400}
            $color={theme.typography.text.color}
          >
            {index + 1}. {name}
          </Text>
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
