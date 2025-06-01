import { useCallback } from "react";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon, IconRound, Text } from "../../ui";

interface NavigationProps {
  name: string;
  index: number;
  activeIndex: number;
  isLast: boolean;
  onSelect?: () => void;
}

export const Navigation = ({
  name,
  index,
  activeIndex,
  isLast,
  onSelect,
}: NavigationProps) => {
  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const handleKeySelect: React.KeyboardEventHandler = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.();
      }
    },
    [onSelect],
  );

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
                settings.theme.card.background,
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
          {...(!showFullContent && {
            $overflow: "hidden",
            $whiteSpace: "nowrap",
            $textOverflow: "ellipsis",
          })}
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick: onSelect,
            onKeyDown: handleKeySelect,
            tabIndex: 0,
            $cursor: "pointer",
          })}
        >
          <Text $weight={index === activeIndex ? 600 : 400}>
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
