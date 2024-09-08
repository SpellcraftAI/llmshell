import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, type BoxProps } from "ink"
import { PasswordInput, TextInput } from "@inkjs/ui"
import { FocusIndicator } from "@/components/FocusIndicator"

interface FormInputProps extends BoxProps {
  type?: "text" | "password";
  label?: string;
  placeholder?: string;
  initialValue?: string;
  indicateFocus?: boolean;
  onSave?: (value: string) => void;
  isDisabled?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  type = "text",
  label, 
  placeholder, 
  initialValue,
  indicateFocus = true,
  isDisabled = false,
  onSave,
  ...boxProps
}) => {
  const [value, setValue] = useState<string | undefined>(initialValue)
  const [showSaved, setShowSaved] = useState<boolean>(false)

  const handleSubmit = useCallback(
    (newValue: string): void => {
      if (newValue.trim()) {
        setValue(newValue)
        setShowSaved(true)
        onSave?.(newValue)
      }
    },
    [onSave]
  )

  useEffect(() => {
    if (showSaved) {
      const timer = setTimeout(() => {
        setShowSaved(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showSaved])

  const input = 
    type === "text"
      ? (
        <TextInput
          defaultValue={value}
          placeholder={placeholder}
          onSubmit={handleSubmit}
          isDisabled={isDisabled}
        />
      )
      : (
        <PasswordInput
          placeholder={placeholder}
          onSubmit={handleSubmit}
          isDisabled={isDisabled}
        />
      )

  return (
    <Box flexDirection="column" {...boxProps}>
      {label && <Text dimColor> {label}</Text>}

      <FocusIndicator 
        indicateFocus={indicateFocus} 
        borderColor={showSaved ? "green" : undefined} 
        flexDirection="row" 
        flexGrow={1}
        paddingX={1}
      >
        {input}
      </FocusIndicator>

      {showSaved 
        ? <Text color="green">✔ Saved.</Text>
        : <Box height={1} />}
    </Box>
  )
}