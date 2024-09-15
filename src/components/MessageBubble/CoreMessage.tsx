import type { CoreMessage } from "ai"
import { MessageBubble } from "."
import { Box, Text } from "ink"
import { emphasize, parseCodeBlocks, parseMarkdown } from "./parse"


// const MessageRow = () => {}

export const CoreMessageBubble = ({ message, waiting = false }: { message: CoreMessage, waiting?: boolean }) => {
  const from = message.role === "assistant" ? "Claude" : "you"

  if (Array.isArray(message.content)) {
    return message.content.map(
      (messageContent, index) => {
        switch (messageContent.type) {
        case "text":
          return (
            <MessageBubble key={index} from={from} text={parseCodeBlocks(messageContent.text)} waiting={waiting} />
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
          if (messageContent.toolName === "google") {
            const searchResults = JSON.parse(messageContent.result as string)
            return (
              <Box flexDirection="column" paddingLeft={1} gap={1}>
                {searchResults.map((result: any, index: number) => (
                  <Box key={index} flexDirection="column" alignItems="flex-start">
                    <Text bold>{result.title}</Text>
                    
                    <Box flexDirection="column">
                      <Text dimColor>{result.primaryLink}</Text>
                      <Text>{result.snippet}</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            )
          }

          const result = 
            messageContent.toolName === "read"
              ? emphasize.highlightAuto(messageContent.result as string).value
              : messageContent.result as string

          return (
            // <MessageRow>
            <Box key={index} flexDirection="column" paddingLeft={1} alignItems="flex-start">
              {/* <Box borderStyle="round" borderDimColor flexShrink={1}>
                <Text bold>{messageContent.toolName}</Text>
              </Box> */}
              <Text>{result}</Text>
            </Box>
            // </MessageRow>
          )
        }
      }
    )
  }

  return (
    <MessageBubble from={from} text={parseCodeBlocks(message.content)} waiting={waiting} />
  )
}