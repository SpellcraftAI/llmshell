import React, { useState } from "react"
import { Text, useInput, Box } from "ink"
import chalk from "chalk"


interface InputProps {
  defaultValue?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  isDisabled?: boolean;
  mask?: string;
}

const Input = ({ 
  defaultValue = "", 
  placeholder = "", 
  onSubmit, 
  isDisabled = false, 
  mask 
}: InputProps) => {
  const [value, setValue] = useState(defaultValue)
  const [cursorPosition, setCursorPosition] = useState(defaultValue.length)

  useInput((input, key) => {
    if (isDisabled) return

    if (key.return) {
      onSubmit?.(value)
    } else if ((key.ctrl || key.meta || key.shift) && (key.delete || key.backspace)) { 
      setValue("")
      setCursorPosition(0)
    } else if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1))
      setCursorPosition((prev) => Math.max(0, prev - 1))
    } else if (key.leftArrow) {
      setCursorPosition((prev) => Math.max(0, prev - 1))
    } else if (key.rightArrow) {
      setCursorPosition((prev) => Math.min(value.length, prev + 1))
    } else if (!key.ctrl && !key.meta) {
      setValue((prev) => {
        const newValue = prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition)
        setCursorPosition((prevPos) => prevPos + input.length)
        return newValue
      })
    }
  }, { isActive: !isDisabled })

  if (!value) {
    return (
      <Box>
        <Text dimColor>{placeholder}</Text>
      </Box>
    )
  }

  const displayValue = mask ? mask.repeat(value.length) : value
  if (isDisabled) {
    return (
      <Box>
        <Text dimColor>{displayValue}</Text>
      </Box>
    )
  }
 
  const before = displayValue.slice(0, cursorPosition)
  const after = displayValue.slice(cursorPosition + 1)
  const at = displayValue[cursorPosition] || " "

  return (
    <Box>
      <Text dimColor={isDisabled}>
        {`${before}${chalk.inverse(at)}${after}`}
      </Text>
    </Box>
  )
}

export const TextInput = (props: Omit<InputProps, "mask">) => {
  return <Input {...props} />
}

export const PasswordInput = (props: Omit<InputProps, "mask">) => {
  return <Input {...props} mask="*" />
}
