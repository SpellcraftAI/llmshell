import { useCallback } from "react"
import { Box, Text } from "ink"

import { FormInput } from "@/components/FormInput"
import { Column } from "@/components/Flex"
import { CenterView } from "@/views/Center"

import { useResumeStdin } from "@/hooks/useResumeStdin"
import { useClearScreen } from "@/hooks/useClearScreen"
import { getConfigPath } from "@/lib/log"
import { useAppState } from "@/lib/state"

export const Activation: React.FC = () => {
  const { state: { config }, update } = useAppState()

  useClearScreen()
  useResumeStdin()

  const handleSaveLicenseKey = useCallback(async (value: string) => {
    update({ config: { ...config, licenseKey: value } })
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }, [config, update])

  return (
    <CenterView maxWidth={60} gap={1} marginTop={2} paddingY={1} borderStyle="round" borderDimColor>
      <Box flexDirection="column" alignItems="center" gap={1}>
        <Text bold>Activation</Text>
        <Text>You can activate a License Key below to use Bing Search and Internet Browsing.</Text>
        <Text underline dimColor>{getConfigPath()}</Text>
      </Box>

      <Column gap={1} paddingY={1} paddingX={1} alignSelf="flex-start">
        <FormInput
          label="License Key"
          placeholder={"Paste your License Key here..."}
          type="password"
          initialValue={config.licenseKey}
          onSave={handleSaveLicenseKey}
        // isDisabled={!selected}
        />
      </Column>
    </CenterView>
  )
}