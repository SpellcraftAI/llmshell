import { useCallback } from "react"
import { Box, Text } from "ink"

import { FormInput } from "@/components/FormInput"
import { Column } from "@/components/Flex"
import { Menu } from "@/components/Menu"
import { CenterView } from "@/views/Center"

import { useTerminalSize } from "@/hooks/useTerminalSize"
import { useResumeStdin } from "@/hooks/useResumeStdin"
import { useClearScreen } from "@/hooks/useClearScreen"
import { getConfigPath } from "@/lib/log"
import { useAppState } from "@/lib/state"

export const Settings: React.FC = () => {
  const { state: { config }, update } = useAppState()
  const [width] = useTerminalSize({ maxWidth: 60 })

  useClearScreen()
  useResumeStdin()

  const handleSaveAnthropicKey = useCallback((value: string): void => {
    update({ config: { ...config, anthropicApiKey: value } })
  }, [config, update])

  const handleSaveOpenAIKey = useCallback((value: string): void => {
    update({ config: { ...config, openaiApiKey: value } })
  }, [config, update])

  const handleSaveModel = useCallback((model: string): void => {
    switch (model) {
    case "Claude Sonnet 3.5":
    case "GPT-4o":
      update({ config: { ...config, model } })
      break

    default:
      throw new Error(`Unknown model: ${model}`)
    }
  }, [config, update])

  return (
    <CenterView gap={1} width={width} marginTop={2} paddingY={1} borderStyle="round" borderDimColor>
      <Box flexDirection="column" alignItems="center">
        <Box paddingBottom={1}>
          <Text bold>Settings</Text>
        </Box>
        <Text>Change your API key or other settings.</Text>
        <Text><Text underline dimColor>{getConfigPath()}</Text></Text>
      </Box>

      <Menu
        flexDirection="column"
        alignSelf="flex-start"
        gap={1}
        paddingX={1}
        items={["MODEL", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]}
        // onChange={(selectedIndex) => console.log(selectedIndex)}
        renderItem={(item, selected) => {
          switch (item) {
          case "MODEL":
            return (
              <Column>
                <Column paddingX={1}>
                  <Text dimColor>Model</Text>
                </Column>
                <Menu 
                  paddingLeft={1}
                  flexDirection="row"
                  items={["Claude Sonnet 3.5", "GPT-4o"]}
                  defaultValue={config.model} 
                  onSelect={handleSaveModel}
                  isActive={selected}
                  renderItem={(item, selected) => (
                    <Box paddingX={1} borderStyle="round" borderDimColor={!selected}>
                      <Text underline={item === config.model} bold={selected} dimColor={!selected}>{item}</Text>
                    </Box>
                  )} 
                />
              </Column>
            )

          case "ANTHROPIC_API_KEY":
            return (
              <FormInput
                label="Anthropic API Key"
                placeholder={config.anthropicApiKey ? "*".repeat(32) : "Paste your API key here..."}
                type="password"
                initialValue={config.anthropicApiKey}
                onSave={handleSaveAnthropicKey}
                isDisabled={!selected}
              />
            )
              
          case "OPENAI_API_KEY":
            return (
              <FormInput
                label="OpenAI API Key"
                placeholder={"Paste your API key here..."}
                type="password"
                initialValue={config.openaiApiKey}
                onSave={handleSaveOpenAIKey}
                isDisabled={!selected}
              />
            )  
          }
        }}
      />
    </CenterView>
  )
}