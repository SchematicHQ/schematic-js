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
  const iconSize = `${20 / TEXT_BASE_SIZE}rem`;
  return (
    <>
      <Flex
        $gap="0.5rem"
        $alignItems="center"
        $viewport={{
          sm: {
            $gap: "0.16rem",
          },
        }}
      >
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
            $viewport={{
              sm: {
                $display: "none",
              },
            }}
          />
        ) : (
          <Box
            $display="inline-block"
            $viewport={{
              sm: {
                $display: "none",
              },
            }}
          >
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
                width: iconSize,
                height: iconSize,
              }}
            />
          </Box>
        )}

        <Box
          tabIndex={0}
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick,
            $cursor: "pointer",
          })}
        >
          <Text
            $font={theme.typography.text.fontFamily}
            $size="1.1rem"
            $weight={index === activeIndex ? 600 : 400}
            $color={theme.typography.text.color}
          >
            <Box
              $whiteSpace="nowrap"
              $viewport={{
                sm: {
                  $fontSize: "1rem",
                },
              }}
            >
              {index + 1}. {name}
            </Box>
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
