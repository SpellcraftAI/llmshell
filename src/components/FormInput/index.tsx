import React, { useState, useEffect } from "react"
import { Box, Text, type BoxProps } from "ink"
import { TextInput } from "@inkjs/ui"
import { FocusIndicator } from "@/components/FocusIndicator"

interface FormInputProps extends BoxProps {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  indicateFocus?: boolean;
  onSave?: (value: string) => void;
  isDisabled?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ 
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

  const handleSubmit = (newValue: string): void => {
    setValue(newValue)
    setShowSaved(true)
    onSave?.(newValue)
  }

  useEffect(() => {
    if (showSaved) {
      const timer = setTimeout(() => {
        setShowSaved(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showSaved])

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
        <TextInput
          defaultValue={value}
          placeholder={placeholder}
          onSubmit={handleSubmit}
          isDisabled={isDisabled}
        />
      </FocusIndicator>

      {showSaved 
        ? <Text color="green">✔ Saved.</Text>
        : <Box height={1} />}
    </Box>
  )
}