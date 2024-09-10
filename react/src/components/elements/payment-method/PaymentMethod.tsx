import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Box, Flex, Modal, ModalHeader, Text } from "../../ui";
import { darken, lighten, hexToHSL } from "../../../utils";
import { StyledButton } from "../plan-manager/styles";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
    },
    functions: {
      allowEdit: props.functions?.allowEdit ?? true,
    },
  };
};

export type PaymentMethodProps = DesignProps;

export const PaymentMethod = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { data, settings, stripe, layout } = useEmbed();

  const paymentMethod = useMemo(() => {
    const { cardLast4, cardExpMonth, cardExpYear } =
      data.subscription?.paymentMethod || {};

    let monthsToExpiration: number | undefined;
    if (typeof cardExpYear === "number" && typeof cardExpMonth === "number") {
      const timeToExpiration = Math.round(
        +new Date(cardExpYear, cardExpMonth - 1) - +new Date(),
      );
      monthsToExpiration = Math.round(
        timeToExpiration / (1000 * 60 * 60 * 24 * 30),
      );
    }

    return {
      cardLast4,
      monthsToExpiration,
    };
  }, [data.subscription?.paymentMethod]);

  if (!stripe || !data.subscription?.paymentMethod) {
    return null;
  }

  return (
    <div ref={ref} className={className}>
      {props.header.isVisible && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
        >
          <Text
            $font={settings.theme.typography[props.header.fontStyle].fontFamily}
            $size={settings.theme.typography[props.header.fontStyle].fontSize}
            $weight={
              settings.theme.typography[props.header.fontStyle].fontWeight
            }
            $color={settings.theme.typography[props.header.fontStyle].color}
          >
            Payment Method
          </Text>

          {typeof paymentMethod.monthsToExpiration === "number" &&
            Math.abs(paymentMethod.monthsToExpiration) < 4 && (
              <Text
                $font={settings.theme.typography.text.fontFamily}
                $size={14}
                $color="#DB6769"
              >
                {paymentMethod.monthsToExpiration > 0
                  ? `Expires in ${paymentMethod.monthsToExpiration} mo`
                  : "Expired"}
              </Text>
            )}
        </Flex>
      )}

      {paymentMethod.cardLast4 && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
          $background={`${hexToHSL(settings.theme.card.background).l > 50 ? darken(settings.theme.card.background, 10) : lighten(settings.theme.card.background, 20)}`}
          $padding="0.375rem 1rem"
          $borderRadius="9999px"
        >
          <Text $font={settings.theme.typography.text.fontFamily} $size={14}>
            💳 Card ending in {paymentMethod.cardLast4}
          </Text>
        </Flex>
      )}

      {layout === "payment" &&
        createPortal(
          <Modal size="md">
            <ModalHeader>
              <Box $fontWeight="600">Edit payment method</Box>
            </ModalHeader>
            <Flex
              $flexDirection="column"
              $padding="2.5rem"
              $height="100%"
              $gap="1.5rem"
            >
              <Flex
                $flexDirection="column"
                $gap="1rem"
                $backgroundColor="#FBFBFB"
                $borderRadius="0 0 0.5rem 0.5rem"
                $flex="1"
                $height="100%"
              >
                <Flex $flexDirection="column" $height="100%">
                  <Box
                    $fontSize="18px"
                    $marginBottom="1.5rem"
                    $display="inline-block"
                    $width="100%"
                  >
                    Default
                  </Box>
                  <Flex $gap="1rem">
                    <Flex
                      $alignItems="center"
                      $padding=".5rem 1rem"
                      $border="1px solid #E2E5E9"
                      $borderRadius=".5rem"
                      $backgroundColor="#ffffff"
                      $gap="1rem"
                      $width="100%"
                    >
                      <Flex $justifyContent="space-between" $flex="1">
                        <Flex $alignItems="center" $gap="1rem">
                          <Box $display="inline-block">
                            <svg
                              viewBox="0 0 24 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              width="26px"
                              height="auto"
                            >
                              <g>
                                <rect
                                  stroke="#DDD"
                                  fill="#FFF"
                                  x=".25"
                                  y=".25"
                                  width="23"
                                  height="15.5"
                                  rx="2"
                                />
                                <path
                                  d="M2.788 5.914A7.201 7.201 0 0 0 1 5.237l.028-.125h2.737c.371.013.672.125.77.519l.595 2.836.182.854 1.666-4.21h1.799l-2.674 6.167H4.304L2.788 5.914Zm7.312 5.37H8.399l1.064-6.172h1.7L10.1 11.284Zm6.167-6.021-.232 1.333-.153-.066a3.054 3.054 0 0 0-1.268-.236c-.671 0-.972.269-.98.531 0 .29.365.48.96.762.98.44 1.435.979 1.428 1.681-.014 1.28-1.176 2.108-2.96 2.108-.764-.007-1.5-.158-1.898-.328l.238-1.386.224.099c.553.23.917.328 1.596.328.49 0 1.015-.19 1.022-.604 0-.27-.224-.466-.882-.769-.644-.295-1.505-.788-1.491-1.674C11.878 5.84 13.06 5 14.74 5c.658 0 1.19.138 1.526.263Zm2.26 3.834h1.415c-.07-.308-.392-1.786-.392-1.786l-.12-.531c-.083.23-.23.604-.223.59l-.68 1.727Zm2.1-3.985L22 11.284h-1.575s-.154-.71-.203-.926h-2.184l-.357.926h-1.785l2.527-5.66c.175-.4.483-.512.889-.512h1.316Z"
                                  fill="#1434CB"
                                />
                              </g>
                            </svg>
                          </Box>
                          <Box $whiteSpace="nowrap">Visa **** 4242</Box>
                        </Flex>

                        <Flex $alignItems="center">
                          <Box $fontSize="12px" $color="#5D5D5D">
                            Expires: 3/30
                          </Box>
                        </Flex>
                      </Flex>
                    </Flex>

                    <Flex>
                      <StyledButton
                        $size="sm"
                        $color="primary"
                        $variant="outline"
                        style={{
                          whiteSpace: "nowrap",
                          paddingLeft: "1rem",
                          paddingRight: "1rem",
                        }}
                      >
                        Edit
                      </StyledButton>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
              <Flex
                $flexDirection="column"
                $gap="1rem"
                $backgroundColor="#FBFBFB"
                $borderRadius="0 0 0.5rem 0.5rem"
                $flex="1"
                $height="100%"
              >
                <Flex $flexDirection="column" $height="100%">
                  <Box
                    $fontSize="18px"
                    $marginBottom="1.5rem"
                    $display="inline-block"
                    $width="100%"
                  >
                    Others
                  </Box>
                  <Flex $gap="1rem">
                    <Flex
                      $alignItems="center"
                      $padding=".5rem 1rem"
                      $border="1px solid #E2E5E9"
                      $borderRadius=".5rem"
                      $backgroundColor="#ffffff"
                      $gap="1rem"
                      $width="100%"
                    >
                      <Flex $justifyContent="space-between" $flex="1">
                        <Flex $alignItems="center" $gap="1rem">
                          <Box $display="inline-block">
                            <svg
                              viewBox="0 0 24 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              width="26px"
                              height="auto"
                            >
                              <g>
                                <rect
                                  stroke="#DDD"
                                  fill="#FFF"
                                  x=".25"
                                  y=".25"
                                  width="23"
                                  height="15.5"
                                  rx="2"
                                />
                                <path
                                  d="M2.788 5.914A7.201 7.201 0 0 0 1 5.237l.028-.125h2.737c.371.013.672.125.77.519l.595 2.836.182.854 1.666-4.21h1.799l-2.674 6.167H4.304L2.788 5.914Zm7.312 5.37H8.399l1.064-6.172h1.7L10.1 11.284Zm6.167-6.021-.232 1.333-.153-.066a3.054 3.054 0 0 0-1.268-.236c-.671 0-.972.269-.98.531 0 .29.365.48.96.762.98.44 1.435.979 1.428 1.681-.014 1.28-1.176 2.108-2.96 2.108-.764-.007-1.5-.158-1.898-.328l.238-1.386.224.099c.553.23.917.328 1.596.328.49 0 1.015-.19 1.022-.604 0-.27-.224-.466-.882-.769-.644-.295-1.505-.788-1.491-1.674C11.878 5.84 13.06 5 14.74 5c.658 0 1.19.138 1.526.263Zm2.26 3.834h1.415c-.07-.308-.392-1.786-.392-1.786l-.12-.531c-.083.23-.23.604-.223.59l-.68 1.727Zm2.1-3.985L22 11.284h-1.575s-.154-.71-.203-.926h-2.184l-.357.926h-1.785l2.527-5.66c.175-.4.483-.512.889-.512h1.316Z"
                                  fill="#1434CB"
                                />
                              </g>
                            </svg>
                          </Box>
                          <Box $whiteSpace="nowrap">Visa **** 2929</Box>
                        </Flex>

                        <Flex $alignItems="center">
                          <Box $fontSize="12px" $color="#5D5D5D">
                            Expires: 3/30
                          </Box>
                        </Flex>
                      </Flex>
                    </Flex>

                    <Flex $gap="1rem">
                      <StyledButton
                        $size="sm"
                        $color="primary"
                        $variant="outline"
                        style={{
                          whiteSpace: "nowrap",
                          paddingLeft: "1rem",
                          paddingRight: "1rem",
                        }}
                      >
                        Make Default
                      </StyledButton>
                      <StyledButton
                        $size="sm"
                        $color="primary"
                        $variant="outline"
                        style={{
                          whiteSpace: "nowrap",
                          paddingLeft: "1rem",
                          paddingRight: "1rem",
                        }}
                      >
                        Edit
                      </StyledButton>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
            </Flex>
          </Modal>,
          portal || document.body,
        )}
    </div>
  );
});
