import { useEffect, useRef, useState } from "react"
import { Text, useInput } from "ink"
import chalk from "chalk"
import { Themed, ThemedText } from "../Themed"

interface InputProps {
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  isDisabled?: boolean;
  mask?: string;
}

const Input = ({ 
  defaultValue = "", 
  placeholder = "", 
  onChange,
  onSubmit, 
  isDisabled = false, 
  mask 
}: InputProps) => {
  const [value, setValue] = useState(defaultValue)
  const [cursorPosition, setCursorPosition] = useState(defaultValue.length)

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

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

  // Only depend on the value change. The ref always holds the latest onChange.
  useEffect(() => {
    if (value) {
      onChangeRef.current?.(value)
    }
  }, [value])

  if (!value) {
    return (
      <Themed>
        <Text dimColor>{placeholder}</Text>
      </Themed>
    )
  }

  const displayValue = mask ? mask.repeat(value.length) : value
  if (isDisabled) {
    return (
      <Themed>
        <Text dimColor>{displayValue}</Text>
      </Themed>
    )
  }
 
  const before = displayValue.slice(0, cursorPosition)
  const after = displayValue.slice(cursorPosition + 1)
  const at = displayValue[cursorPosition] || " "

  return (
    <Themed>
      <ThemedText dimColor={isDisabled}>
        {`${before}${chalk.inverse(at)}${after}`}
      </ThemedText>
    </Themed>
  )
}

export const TextInput = (props: Omit<InputProps, "mask">) => {
  return <Input {...props} />
}

export const PasswordInput = (props: Omit<InputProps, "mask">) => {
  return <Input {...props} mask="*" />
}
