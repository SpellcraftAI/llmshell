import type { CoreMessage } from "ai"
import { MessageBubble } from "."
import { createANSIRenderer, createParser, finish, parse } from "mdstream"
import { Box, Text } from "ink"

const parseSync = (text: string) => {
  let parsed = ""

  const ansiRenderer = createANSIRenderer({
    level: 1,
    render: (chunk) => parsed += chunk
  })

  const ansiParser = createParser(ansiRenderer)
  parse(ansiParser, text)
  finish(ansiParser)
  return parsed
}

export const CoreMessageBubble = ({ message }: { message: CoreMessage }) => {
  const from = message.role === "assistant" ? "Claude" : "you"

  if (Array.isArray(message.content)) {
    return message.content.map(
      (messageContent, index) => {
        switch (messageContent.type) {
        case "text":
          const loading = message.role === "assistant" && messageContent.text === "..."
          return <MessageBubble key={index} from={from} text={parseSync(messageContent.text)} loading={loading} />

        case "tool-call":
          // const argsTable = stringConsole.table(message.args)
          return (
            <Box key={index} flexDirection="column" paddingLeft={1} alignItems="flex-start">
              {/* <Text bold>Tool</Text> */}
              <Box borderStyle="round" borderDimColor flexShrink={1}>
                <Text bold>{messageContent.toolName}</Text>
              </Box>
              {Object.entries(messageContent.args as object).map(([key, value]) => (
                <Box key={key} flexDirection="row" paddingLeft={1} gap={1} justifyContent="space-around">
                  <Box width={10}><Text bold>{key}</Text></Box>
                  <Text dimColor>{value}</Text>
                </Box>
              ))}
            </Box>
          )

        case "tool-result":
          return (
            <Box key={index} flexDirection="column" paddingLeft={1} alignItems="flex-start">
              <Box borderStyle="round" borderDimColor flexShrink={1}>
                <Text bold>{messageContent.toolName}</Text>
              </Box>
              <Text>{messageContent.result as string}</Text>
            </Box>
          )
        }
      }
    )
  }

  return (
    <MessageBubble from={from} text={parseSync(message.content)} />
  )
}