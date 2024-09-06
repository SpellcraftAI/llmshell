import { Box, Text } from "ink"
import { CenterView } from "./Center"
import { useTerminalSize } from "@/hooks/useTerminalSize"
import { getConfigPath } from "@/lib/log"
import { useAppState } from "./state"
import { FormInput } from "@/components/FormInput"
import { useResumeStdin } from "@/hooks/useResumeStdin"
// import { useClearScreen } from "@/hooks/useClearScreen"

export const Settings: React.FC = () => {
  const { state: { config }, update } = useAppState()
  const [width] = useTerminalSize({ maxWidth: 60 })

  // useClearScreen()

  /**
   * MUST CALL RESUME()! IF YOU CALL USEINPUT() OR USE THE INK/UI TEXT INPUTS IN
   * BUN WITHOUT RESUMING STDIN, IT WILL FREEZE UP CONFUSINGLY AFTER ONLY A FEW
   * KEYSTROKES! WHY NOT ZERO KEYSTROKES? WHO FUCKING KNOWS, I DIDN'T WRITE THIS
   * HOOK, I JUST LOST 3 HOURS TO IT BECAUSE IT LOOKED LIKE IT WAS MY OWN HOOKS
   * SINCE IT WORKED FOR A FEW KEYSTROKES.
   */
  useResumeStdin()

  const handleSaveApiKey = (value: string): void => {
    update({ config: { ...config, apiKey: value } })
  }

  return (
    <CenterView gap={1} width={width} paddingY={1} borderStyle="round" borderDimColor>
      <Box flexDirection="column" alignItems="center">
        <Box paddingBottom={1}>
          <Text bold>Settings</Text>
        </Box>
        <Text>Change your API key or other settings.</Text>
        <Text><Text italic underline dimColor>{getConfigPath()}</Text></Text>
      </Box>

      <Box paddingTop={1} width={width - 4} flexDirection="column" alignSelf="center">
        <FormInput
          label="Anthropic API Key"
          placeholder="Paste your API key here..."
          indicateFocus={false}
          initialValue={config.apiKey}
          onSave={handleSaveApiKey}
        />
      </Box>
    </CenterView>
  )
}