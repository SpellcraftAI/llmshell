import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, type BoxProps } from "ink"
import { Row } from "../Flex"
import { PasswordInput, TextInput } from "./basic"

interface FormInputProps extends BoxProps {
  type?: "text" | "password" | "select";
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
  // const { isFocused } = useFocus({ autoFocus: true })
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

  let input: JSX.Element

  switch (type) {
  case "text":
    input = (
      <TextInput
        defaultValue={value}
        placeholder={placeholder}
        onSubmit={handleSubmit}
        isDisabled={isDisabled || !indicateFocus}
      />
    )
    break
  case "password":
    input = (
      <PasswordInput
        defaultValue={value}
        placeholder={placeholder}
        onSubmit={handleSubmit}
        isDisabled={isDisabled}
      />
    )
    break
  default:
    throw new Error(`Unsupported input type: ${type}`)
  }

  const savedMessage = "✔"

  return (
    <Box flexDirection="column" {...boxProps}>
      {label && (
        <Row gap={1}>
          <Text dimColor={isDisabled || !indicateFocus}> {label}</Text>
          {showSaved ? <Text color="green">{savedMessage}</Text> : <Box width={savedMessage.length} />}
        </Row>
      )}

      <Row>
        <Box 
          borderStyle="round" 
          borderDimColor={isDisabled || !indicateFocus}
          borderColor={showSaved ? "green" : undefined} 
          flexDirection="row" 
          flexGrow={1}
          paddingX={1}
          marginX={1}
        >
          {input}
        </Box>
      </Row>
    </Box>
  )
}