import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Box, Text, type BoxProps } from "ink"
import { Spinner } from "@inkjs/ui"
import { Column, Row } from "../Flex"
import { PasswordInput, TextInput } from "./basic"

type FormInputSaveResponse = string | null | void

interface FormInputProps<T extends FormInputSaveResponse> extends BoxProps {
  type?: "text" | "password" | "select";
  label?: string;
  placeholder?: string;
  initialValue?: string;
  indicateFocus?: boolean;
  onSave?: (value: string) => Promise<T> | T;
  isDisabled?: boolean;
}

export const FormInput = <T extends FormInputSaveResponse,>({
  type = "text",
  label,
  placeholder,
  initialValue,
  indicateFocus = true,
  isDisabled = false,
  onSave,
  ...boxProps
}: FormInputProps<T>) => {
  // const { isFocused } = useFocus({ autoFocus: true })
  const [value, setValue] = useState<string | undefined>(initialValue)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const [message, setMessage] = useState<string | null | undefined>()

  const handleSubmit = useCallback(
    async (newValue: string) => {
      if (newValue.trim()) {
        try {
          const saveResult = onSave?.(newValue)
          let saveResultFinal: T
  
          // For promises, use a loading spinner
          if (saveResult && "then" in saveResult && typeof saveResult?.then === "function") {
            setState("saving")
            saveResultFinal = await saveResult
          } else {
            saveResultFinal = saveResult as T
          }
  
          setValue(newValue)
          setState("saved")
          if (saveResultFinal) {
            setMessage(saveResultFinal)
          }
        } catch (e: unknown) {
          setState("failed")
          if (e instanceof Error) {
            setMessage(e.message)
          } else {
            setMessage(JSON.stringify(e))
          }
        }
      }
    },
    [onSave]
  )

  useEffect(() => {
    switch (state) {
    case "saved":
    case "failed":
      const timer = setTimeout(() => {
        setMessage(null)
        setState("idle")
      }, 3_000)
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
          borderColor={state === "saved" ? "green" : state === "failed" ? "red" : undefined}
          flexDirection="row"
          flexGrow={1}
          paddingX={1}
          marginX={1}
        >
          {input}
        </Box>
      </Row>

      {message && (
        <Column paddingX={2} width={40}>
          <Text color={state === "saved" ? "green" : state === "failed" ? "red" : undefined}>{message}</Text>
        </Column>
      )}
    </Box>
  )
}