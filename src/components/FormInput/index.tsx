import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Box, Text, type BoxProps } from "ink"
import { Spinner } from "@inkjs/ui"
import { Row } from "../Flex"
import { PasswordInput, TextInput } from "./basic"

interface FormInputProps extends BoxProps {
  type?: "text" | "password" | "select";
  label?: string;
  placeholder?: string;
  initialValue?: string;
  indicateFocus?: boolean;
  onSave?: (value: string) => Promise<void> | void;
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
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")

  const handleSubmit = useCallback(
    async (newValue: string) => {
      if (newValue.trim()) {
        const saveResult = onSave?.(newValue)
        
        // For promises, use a loading spinner/
        if (typeof saveResult?.then === "function") {
          setState("saving")
          await saveResult
        }

        setValue(newValue)
        setState("saved")
      }
    },
    [onSave]
  )

  useEffect(() => {
    switch (state) {
    case "saved":
      const timer = setTimeout(() => {
        setState("idle")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state])

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
  const sideContent = useMemo(
    () => {
      switch (state) {
      case "saving":
        return (
          <Row gap={1}>
            <Spinner />
            <Text dimColor>Saving...</Text>
          </Row>
        )

      case "saved":
        return <Text color="green">{savedMessage}</Text>
      }
    },
    [state]
  )

  return (
    <Box flexDirection="column" {...boxProps}>
      {label && (
        <Row gap={1}>
          <Text dimColor={isDisabled || !indicateFocus}> {label}</Text>
          {sideContent ? sideContent : <Box width={savedMessage.length} />}
        </Row>
      )}

      <Row>
        <Box 
          borderStyle="round" 
          borderDimColor={isDisabled || !indicateFocus}
          borderColor={state === "saved" ? "green" : undefined} 
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