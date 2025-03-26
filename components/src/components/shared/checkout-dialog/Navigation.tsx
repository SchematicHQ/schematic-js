import { useTheme } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon, IconRound } from "../../ui";

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

  const showFullContent = index === activeIndex || index === activeIndex + 1;

  return (
    <>
      <Flex
        $gap="0.5rem"
        $alignItems="center"
        {...(!showFullContent && { $flexGrow: 1, $minWidth: 0 })}
      >
        <Box
          $display="none"
          $viewport={{
            md: {
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
          $fontFamily={theme.typography.text.fontFamily}
          $fontWeight={index === activeIndex ? 600 : 400}
          $color={theme.typography.text.color}
          {...(!showFullContent && {
            $overflow: "hidden",
            $whiteSpace: "nowrap",
            $textOverflow: "ellipsis",
          })}
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick,
            $cursor: "pointer",
          })}
          $viewport={{
            md: {
              $fontSize: `${19 / TEXT_BASE_SIZE}rem`,
            },
          }}
        >
          {index + 1}. {name}
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
