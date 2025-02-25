import { useCallback } from "react"
import { Box, Text } from "ink"

import { FormInput } from "@/components/FormInput"
import { Column } from "@/components/Flex"
import { Menu } from "@/components/Menu"
import { CenterView } from "@/views/Center"

import { useResumeStdin } from "@/hooks/useResumeStdin"
import { useClearScreen } from "@/hooks/useClearScreen"
import { getConfigPath } from "@/lib/log"
import { useAppState } from "@/lib/state"
import { Themed, ThemedText } from "@/components/Themed"
// import { Scrollable } from "@/components/Scrollable"

export const Settings: React.FC = () => {
  const { state: { config }, update } = useAppState()

  useResumeStdin()
  useClearScreen()

  const handleSaveAnthropicKey = useCallback((value: string): void => {
    update({ config: { ...config, anthropicApiKey: value } })
  }, [config, update])

  const handleSaveOpenAIKey = useCallback((value: string): void => {
    update({ config: { ...config, openaiApiKey: value } })
  }, [config, update])

  const handleSaveModel = useCallback((model: string): void => {
    switch (model) {
    case "Claude Sonnet 3.7":
    case "GPT-4o":
      update({ config: { ...config, model } })
      break

    default:
      throw new Error(`Unknown model: ${model}`)
    }
  }, [config, update])

  const handleChangeThemeColor = useCallback((color: string): void => {
    update({ config: { ...config, themeColor: color } })
  }, [config, update])

  const items = ["MODEL", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "THEME_COLOR"]

  return (
    <CenterView justifyContent="flex-start" gap={1} marginTop={2} paddingY={1} paddingX={1} borderStyle="round" borderColor={config.themeColor} borderDimColor>
      <Box flexDirection="column" alignItems="center">
        <Box paddingBottom={1}>
          <ThemedText bold>Settings</ThemedText>
        </Box>
        <Text>Change your API key or other settings.</Text>
        <Text><Text underline dimColor>{getConfigPath()}</Text></Text>
      </Box>

      {/* 
        Scrollable freezes here on second page for any combo of (items.length, visibleItems) 
        - not sure why, works for Threads view, not spending any more time on it. Requiring
        terminal height >=27.
      */}
      <Menu
        flexDirection="column"
        alignSelf="flex-start"
        alignItems="flex-start"
        // gap={1}
        // paddingX={1}
        items={items}
        // onChange={(selectedIndex) => console.log(selectedIndex)}
        // itemHeight={4}
        // visibleItems={2}
        isActive
        renderItem={(item, selected) => {
          switch (item) {
          case "MODEL":
            return (
              <Column>
                <Column paddingX={1}>
                  <Text dimColor={!selected}>Model</Text>
                </Column>
                <Menu 
                  paddingLeft={1}
                  flexDirection="row"
                  items={["Claude Sonnet 3.7", "GPT-4o"]}
                  defaultValue={config.model} 
                  onSelect={handleSaveModel}
                  isActive={selected}
                  renderItem={(item, selected) => (
                    <Themed paddingX={1} borderStyle="round" borderDimColor={!selected}>
                      <ThemedText underline={item === config.model} dimColor={!selected}>{item}</ThemedText>
                    </Themed>
                  )} 
                />
              </Column>
            )

          case "ANTHROPIC_API_KEY":
            return (
              <FormInput
                label="Anthropic API Key"
                placeholder={"Paste your API key here..."}
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

          case "THEME_COLOR":
            return (
              <FormInput
                label="Theme Color"
                placeholder={"Enter your theme color here..."}
                initialValue={config.themeColor}
                onSave={handleChangeThemeColor}
                isDisabled={!selected}
                borderColor={config.themeColor}
              />
            )
          }

          return (
            <Text dimColor>{item}</Text>
          )
        }}
      />
    </CenterView>
  )
}