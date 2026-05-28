import type { CheckoutFieldWithValue } from "../../../api/checkoutexternal";
import { useIsLightBackground } from "../../../hooks";
import { Box, Flex, Text } from "../../ui";
import { Input, Label } from "../payment-form/styles";

interface CustomCheckoutFieldsProps {
  fields: CheckoutFieldWithValue[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}

export const CustomCheckoutFields = ({
  fields,
  values,
  onChange,
}: CustomCheckoutFieldsProps) => {
  const isLightBackground = useIsLightBackground();

  if (fields.length === 0) {
    return null;
  }

  return (
    <Flex $flexDirection="column" $gap="1rem">
      {fields.map((field) => (
        <Box key={field.id}>
          <Label htmlFor={`custom-field-${field.id}`}>
            {field.name}
            {field.required && (
              <span style={{ color: "#DB6669", marginLeft: "0.25rem" }}>*</span>
            )}
          </Label>
          <Input
            id={`custom-field-${field.id}`}
            type="text"
            value={values[field.id] ?? field.value ?? ""}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
          {field.helperText && (
            <Text
              $size={12}
              $color={isLightBackground ? "#666" : "#999"}
              style={{ marginTop: "0.25rem" }}
            >
              {field.helperText}
            </Text>
          )}
        </Box>
      ))}
    </Flex>
  );
};
