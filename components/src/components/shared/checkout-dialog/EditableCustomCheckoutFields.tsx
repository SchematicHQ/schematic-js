import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Box, Button, Flex, Text } from "../../ui";

import { CustomCheckoutFields } from "./CustomCheckoutFields";

export const EditableCustomCheckoutFields = () => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const { data, updateCustomFieldValues } = useEmbed();

  const customCheckoutFields = useMemo(
    () => data?.customCheckoutFields ?? [],
    [data?.customCheckoutFields],
  );

  const serverFieldValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of customCheckoutFields) {
      values[field.id] = field.value ?? "";
    }
    return values;
  }, [customCheckoutFields]);

  const [editing, setEditing] = useState(false);
  const [values, setValues] =
    useState<Record<string, string>>(serverFieldValues);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleEdit = useCallback(() => {
    setValues(serverFieldValues);
    setEditing(true);
  }, [serverFieldValues]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setValues(serverFieldValues);
  }, [serverFieldValues]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateCustomFieldValues?.(values);
      setEditing(false);
    } catch {
      setError(t("Error saving custom field values. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }, [t, values, updateCustomFieldValues]);

  if (customCheckoutFields.length === 0) {
    return null;
  }

  const hasIncompleteRequired = customCheckoutFields.some(
    (field) => field.required && !values[field.id]?.trim(),
  );

  return (
    <Flex
      $flexDirection="column"
      $gap="1rem"
      $padding="1rem"
      $backgroundColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.025)"
          : "hsla(0, 0%, 100%, 0.025)"
      }
      $viewport={{
        md: {
          $padding: "0 2.5rem 2rem",
        },
      }}
    >
      <Flex $justifyContent="space-between" $alignItems="center">
        <Text display="heading4">{t("Additional information")}</Text>
        {!editing && (
          <Text
            onClick={handleEdit}
            onKeyDown={createKeyboardExecutionHandler(handleEdit)}
            display="link"
            $leading="none"
          >
            {t("Edit")}
          </Text>
        )}
      </Flex>

      {editing ? (
        <Flex $flexDirection="column" $gap="1rem">
          <CustomCheckoutFields
            fields={customCheckoutFields}
            values={values}
            onChange={handleChange}
          />

          <Flex $justifyContent="end" $gap="0.5rem">
            <Button type="button" onClick={handleCancel} $variant="text">
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              $isLoading={isSaving}
              disabled={isSaving || hasIncompleteRequired}
            >
              {t("Save changes")}
            </Button>
          </Flex>

          {error && (
            <Box>
              <Text $weight={500} $color="#DB6669">
                {error}
              </Text>
            </Box>
          )}
        </Flex>
      ) : (
        <Flex $flexDirection="column" $gap="0.5rem">
          {customCheckoutFields.map((field) => (
            <Flex key={field.id} $flexDirection="column" $gap="0.125rem">
              <Text
                $size={12}
                $color={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.5)"
                    : "hsla(0, 0%, 100%, 0.5)"
                }
              >
                {field.name}
              </Text>
              <Text $size={14}>
                {field.value || (
                  <span style={{ fontStyle: "italic", opacity: 0.5 }}>
                    {t("Not provided")}
                  </span>
                )}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
};
