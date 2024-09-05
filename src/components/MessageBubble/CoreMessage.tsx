import type { CoreMessage } from "ai"
import { MessageBubble, MessageRow } from "."
import { createANSIRenderer, createParser, finish, parse } from "mdstream"
import { Box, Text } from "ink"

export const parseSync = (text: string) => {
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

// const MessageRow = () => {}

export const CoreMessageBubble = ({ message, waiting = false }: { message: CoreMessage, waiting?: boolean }) => {
  const from = message.role === "assistant" ? "Claude" : "you"

  if (Array.isArray(message.content)) {
    return message.content.map(
      (messageContent, index) => {
        switch (messageContent.type) {
        case "text":
          return (
            <MessageBubble key={index} from={from} text={parseSync(messageContent.text)} waiting={waiting} />
          )

        case "tool-call":
          // const argsTable = stringConsole.table(message.args)
          return (
            // <MessageRow>
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
            // </MessageRow>
          )

        case "tool-result":
          return (
            // <MessageRow>
            <Box key={index} flexDirection="column" paddingLeft={1} alignItems="flex-start">
              {/* <Box borderStyle="round" borderDimColor flexShrink={1}>
                <Text bold>{messageContent.toolName}</Text>
              </Box> */}
              <Text>{messageContent.result as string}</Text>
            </Box>
            // </MessageRow>
          )
        }
      }
    )
  }

  return (
    <MessageBubble from={from} text={parseSync(message.content)} waiting={waiting} />
  )
}