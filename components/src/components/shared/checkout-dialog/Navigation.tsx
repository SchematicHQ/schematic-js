import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Box, Flex, Icon, IconRound } from "../../ui";

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

  return (
    <>
      <Flex $gap="0.5rem" $alignItems="center">
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
          $whiteSpace="nowrap"
          $fontFamily={`${settings.theme.typography.text.fontFamily}, sans-serif`}
          $fontSize={`${settings.theme.typography.text.fontSize / TEXT_BASE_SIZE}rem`}
          $fontWeight={index === activeIndex ? 600 : 400}
          $color={settings.theme.typography.text.color}
          {...(index !== activeIndex && { $opacity: "0.6375" })}
          {...(index < activeIndex && {
            onClick: onSelect,
            onKeyDown: createKeyboardExecutionHandler(onSelect),
            tabIndex: 0,
            $cursor: "pointer",
          })}
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
